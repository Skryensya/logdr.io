# 📋 Plan Técnico Detallado: Logdrio PWA Offline-First

## 🎯 Objetivo
Transformar Logdrio en una PWA de finanzas personales offline-first con PouchDB y autenticación híbrida, implementando un modelo de doble entrada con deltas inmutables y multi-moneda.

---

## 📊 FASE 1: Estructura de Datos PouchDB

### 1.1 Arquitectura de Base de Datos
**Decisión**: Una DB por usuario (`logdrio-{userId}`) 
- ✅ Aislamiento perfecto entre usuarios
- ✅ Facilita backup/restore individual
- ✅ Mejor rendimiento al evitar filtros por user_id
- ❌ Más complejo el cambio de usuario

### 1.2 Esquema de Documentos

#### **Usuarios (Mutable)**
```typescript
interface User {
  _id: "user"
  _rev?: string
  userId: string
  email: string
  displayName: string
  homeCurrency: "CLP" | "USD" | "EUR" | "BTC"
  locale: "es-CL" | "en-US"
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

#### **Cuentas (Mutable)**
```typescript
interface Account {
  _id: `account::${string}`
  _rev?: string
  name: string
  type: "asset" | "liability" | "income" | "expense" | "equity"
  visible: boolean
  archived: boolean
  defaultCurrency: string
  minorUnit: number // CLP=0, USD=2, BTC=8
  balance: number // cache calculado
  createdAt: string
  updatedAt: string
}
```

#### **Categorías (Mutable)**
```typescript
interface Category {
  _id: `category::${string}`
  _rev?: string
  name: string
  kind: "income" | "expense" | "transfer"
  parentCategoryId?: string
  color?: string
  icon?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}
```

#### **Transacciones (Mutable)**
```typescript
interface Transaction {
  _id: `txn::${string}`
  _rev?: string
  date: string // YYYY-MM-DD
  description: string
  categoryId?: string
  tags?: string[]
  yearMonth: string // YYYY-MM para índices
  lineCount: number // cache
  createdAt: string
  updatedAt: string
}
```

#### **Líneas de Transacción (INMUTABLE)**
```typescript
interface TransactionLine {
  _id: `line::${ulid()}`
  // NO _rev - inmutable
  transactionId: string
  accountId: string
  amount: number // entero en unidad mínima
  currency: string
  date: string // YYYY-MM-DD duplicado
  yearMonth: string // YYYY-MM duplicado
  categoryId?: string
  isDebit: boolean // derivado del signo
  createdAt: string // nunca cambia
  
  // Campos para deltas
  deltaType?: "correction" | "reversal"
  originalLineId?: string
  reason?: string
}
```

#### **Configuración de Usuario (Mutable)**
```typescript
interface UserSettings {
  _id: "settings"
  _rev?: string
  
  // Configuración de seguridad
  requireGatePerSession: boolean
  gateMethod: "pin" | "webauthn" | "none"
  gateDurationMin: number // default 5
  
  // Configuración financiera
  homeCurrency: string
  decimalPlaces: number
  dateFormat: string
  firstDayOfWeek: 0 | 1 // 0=domingo, 1=lunes
  
  // UI/UX
  defaultAccountView: "all" | "active"
  showBalance: boolean
  compactMode: boolean
  
  createdAt: string
  updatedAt: string
}
```

### 1.3 Índices PouchDB (pouchdb-find)

```json
[
  {
    "index": {
      "fields": ["type", "archived", "updatedAt"]
    },
    "name": "accounts-active",
    "ddoc": "accounts-active"
  },
  {
    "index": {
      "fields": ["yearMonth", "accountId", "currency"]
    },
    "name": "lines-monthly-account",
    "ddoc": "lines-monthly-account"
  },
  {
    "index": {
      "fields": ["yearMonth", "categoryId", "currency"]
    },
    "name": "lines-monthly-category", 
    "ddoc": "lines-monthly-category"
  },
  {
    "index": {
      "fields": ["transactionId", "createdAt"]
    },
    "name": "lines-by-transaction",
    "ddoc": "lines-by-transaction"
  },
  {
    "index": {
      "fields": ["date", "categoryId"]
    },
    "name": "transactions-by-date",
    "ddoc": "transactions-by-date"
  }
]
```

### 1.4 Vistas Locales (Map/Reduce)

```javascript
// Vista: monthly_balance
function(doc) {
  if (doc._id.startsWith('line::')) {
    emit([doc.yearMonth, doc.accountId, doc.currency], doc.amount);
  }
}
// Reduce: _sum

// Vista: monthly_by_category  
function(doc) {
  if (doc._id.startsWith('line::') && doc.categoryId) {
    emit([doc.yearMonth, doc.categoryId, doc.currency], doc.amount);
  }
}
// Reduce: _sum

// Vista: monthly_cashflow
function(doc) {
  if (doc._id.startsWith('line::')) {
    var kind = doc.amount >= 0 ? 'in' : 'out';
    emit([doc.yearMonth, doc.currency, kind], Math.abs(doc.amount));
  }
}
// Reduce: _sum
```

---

## 🔐 FASE 2: Autenticación Híbrida

### 2.1 Estados de Autenticación

```typescript
enum AuthState {
  ANON = "anon",           // Sin autenticar
  JWT_OK = "jwt_ok",       // JWT válido, sin gate
  JWT_STALE = "jwt_stale", // JWT expirado, necesita renovar
  GATED = "gated",         // Necesita PIN/WebAuthn
  UNLOCKED = "unlocked",   // Completamente autenticado
  ERROR = "error"          // Error de autenticación
}

interface AuthStatus {
  state: AuthState
  userId?: string
  email?: string
  jwtExpiresAt?: number
  gateExpiresAt?: number // timestamp sessionStorage
  requiresGate: boolean
}
```

### 2.2 Flujo de Estados

```
ANON --> (login) --> JWT_OK --> (require_gate) --> GATED
   ^                     |                           |
   |                     v                           v
   +-- (logout) <-- UNLOCKED <-- (pin/webauthn) ----+
                       |
                       v
                 (5min/close) --> GATED
                       |
                       v
                 (jwt_expire) --> JWT_STALE --> (online) --> JWT_OK
                                      |
                                      v
                                 (offline_strict) --> ANON
```

### 2.3 Componentes de Autenticación

#### **JWT Offline (RS256/ES256)**
```typescript
interface JWTPayload {
  iss: string
  aud: string
  sub: string // userId
  email: string
  exp: number
  iat: number
  scope?: string[]
}

class OfflineJWTValidator {
  private publicKey: JsonWebKey

  async validateToken(token: string): Promise<JWTPayload | null> {
    // 1. Decodificar header/payload
    // 2. Verificar firma con publicKey
    // 3. Validar exp, iss, aud
    // 4. Retornar payload o null
  }
}
```

#### **Gate por Sesión (PIN)**
```typescript
interface PINGate {
  async setupPIN(pin: string, userId: string): Promise<void> {
    // PBKDF2(pin + salt, 100000 iteraciones)
    // Guardar hash en localStorage
  }

  async verifyPIN(pin: string, userId: string): Promise<boolean> {
    // Verificar contra hash almacenado
    // Si OK, establecer gate_until en sessionStorage
  }

  isGateValid(): boolean {
    // Verificar si gate_until > Date.now()
  }
}
```

#### **Gate por Sesión (WebAuthn)**
```typescript
interface WebAuthnGate {
  async register(userId: string): Promise<void> {
    // navigator.credentials.create() con userVerification
    // Guardar credentialId en localStorage
  }

  async authenticate(userId: string): Promise<boolean> {
    // navigator.credentials.get()
    // Si OK, establecer gate_until en sessionStorage
  }
}
```

### 2.4 Políticas de Seguridad

**JWT Expirado Offline - Opción Laxa (Recomendada)**
- Permitir acceso solo con gate local válido
- Mostrar warning "Offline - Revalidar al conectar"
- Bloquear operaciones sensibles (export, sync)

**Multi-Usuario**
- Un perfil activo por sesión
- Cambio de perfil = logout + login
- Base de datos independiente por usuario

---

## 💰 FASE 3: Sistema Monetario

### 3.1 Manejo de Monedas

```typescript
interface CurrencyConfig {
  code: string
  name: string
  symbol: string
  minorUnit: number // posiciones decimales
  defaultLocale: string
}

const CURRENCIES: Record<string, CurrencyConfig> = {
  CLP: { code: "CLP", name: "Peso Chileno", symbol: "$", minorUnit: 0, defaultLocale: "es-CL" },
  USD: { code: "USD", name: "US Dollar", symbol: "$", minorUnit: 2, defaultLocale: "en-US" },
  EUR: { code: "EUR", name: "Euro", symbol: "€", minorUnit: 2, defaultLocale: "en-EU" },
  BTC: { code: "BTC", name: "Bitcoin", symbol: "₿", minorUnit: 8, defaultLocale: "en-US" }
}
```

### 3.2 Conversión de Montos

```typescript
class MoneyAmount {
  constructor(
    private amount: number,    // entero en unidad mínima
    private currency: string
  ) {}

  toDisplay(): string {
    const config = CURRENCIES[this.currency]
    const divisor = Math.pow(10, config.minorUnit)
    const value = this.amount / divisor
    
    return new Intl.NumberFormat(config.defaultLocale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: config.minorUnit,
      maximumFractionDigits: config.minorUnit
    }).format(value)
  }

  static fromUserInput(input: string, currency: string): MoneyAmount {
    const config = CURRENCIES[currency]
    const multiplier = Math.pow(10, config.minorUnit)
    const amount = Math.round(parseFloat(input) * multiplier)
    return new MoneyAmount(amount, currency)
  }
}
```

---

## 🏗️ FASE 4: Implementación por Pasos

### Paso 1: Infraestructura Base (Semana 1)
1. **Setup PouchDB mejorado**
   - Instalar pouchdb-find plugin
   - Crear sistema de DB por usuario
   - Implementar inicialización de esquema

2. **Tipos TypeScript**
   - Definir todas las interfaces
   - Crear tipos para estados de auth
   - Configurar validación con Zod

3. **Sistema monetario**
   - Implementar clase MoneyAmount
   - Crear helpers de conversión
   - Tests unitarios para cálculos

### Paso 2: Autenticación (Semana 2)
1. **JWT Offline**
   - Implementar validador con WebCrypto API
   - Crear mock de JWT para desarrollo
   - Integrar con estados de auth

2. **Gate PIN**
   - Implementar PBKDF2 con WebCrypto
   - Crear UI de setup/verificación
   - Manejar sessionStorage para expiración

3. **Gate WebAuthn (opcional)**
   - Implementar registro básico
   - Crear flujo de autenticación
   - Fallback a PIN si no disponible

### Paso 3: Modelo de Datos (Semana 3-4)
1. **Entidades mutables**
   - Implementar CRUD para accounts, categories
   - Crear validaciones de negocio
   - Implementar soft delete (archived)

2. **Transacciones y líneas**
   - Crear sistema de double-entry
   - Implementar inmutabilidad para lines
   - Validar balance en transacciones

3. **Índices y vistas**
   - Crear todos los índices definidos
   - Implementar vistas Map/Reduce
   - Tests de performance con datos sintéticos

### Paso 4: UI/UX (Semana 5-6)
1. **Pantallas principales**
   - Login/Setup inicial
   - Dashboard con balances
   - Lista de transacciones

2. **Formularios**
   - Crear transacción (double-entry)
   - Gestión de cuentas
   - Configuración de usuario

3. **Navegación offline**
   - Indicadores de estado
   - Manejo de errores
   - Caching inteligente

---

## ✅ Checklist de Pruebas

### Datos y Monedas
- [ ] Crear cuenta CLP, insertar $1000 → stored como 1000
- [ ] Crear cuenta USD, insertar $10.50 → stored como 1050  
- [ ] Crear cuenta BTC, insertar ₿0.00000001 → stored como 1
- [ ] Verificar balance calculado por vistas Map/Reduce
- [ ] Probar transacción multi-moneda (CLP → USD)

### Autenticación
- [ ] JWT válido → estado JWT_OK
- [ ] JWT expirado → estado JWT_STALE  
- [ ] Gate PIN: setup → verify → 5min timeout
- [ ] Gate WebAuthn: registro → auth (si disponible)
- [ ] Logout completo → estado ANON

### Transacciones
- [ ] Crear transacción simple (2 líneas)
- [ ] Crear transacción compleja (3+ líneas)
- [ ] Verificar inmutabilidad de transaction_lines
- [ ] Crear corrección (delta) de línea existente
- [ ] Validar que balances se actualizan

### Performance
- [ ] Cargar 1000 transacciones < 100ms
- [ ] Vista monthly_balance < 50ms
- [ ] Búsqueda por categoría < 30ms
- [ ] Cambio de usuario < 200ms

---

## 🎯 Criterios de Aceptación

1. **Montos siempre enteros**: CLP sin decimales, USD/EUR con 2, BTC con 8
2. **Inmutabilidad garantizada**: transaction_lines nunca se editan/borran
3. **Vistas funcionando**: Balances mensuales calculados correctamente
4. **Auth híbrida operativa**: JWT + Gate por sesión con timeouts
5. **Offline-first real**: Funciona sin conexión, sync preparado para futuro
6. **Multi-usuario**: Cambio seguro entre perfiles
7. **Performance acceptable**: < 100ms para operaciones críticas

---

## 🔄 Preparación para Futuro

### Hooks de Sincronización
```typescript
interface SyncHooks {
  onSyncStart(): void
  onSyncComplete(changes: SyncResult): void  
  onSyncError(error: Error): void
  onConflict(doc: any, conflict: any): Promise<any>
}
```

### Placeholders para Cifrado
```typescript
interface EncryptionService {
  encrypt(data: any, key: string): Promise<string>
  decrypt(encrypted: string, key: string): Promise<any>
  deriveKey(password: string, salt: string): Promise<string>
}
```

### Configuración de Replicación
```typescript
interface ReplicationConfig {
  remoteURL: string
  credentials: any
  continuous: boolean
  retry: boolean
  filter?: string
  conflicts: 'merge' | 'latest' | 'manual'
}
```