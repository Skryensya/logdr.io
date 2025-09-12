"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PINUtils } from '@/lib/auth/pin-gate';
import { WebAuthnUtils } from '@/lib/auth/webauthn-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, Fingerprint, Shield, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SecurityPage() {
  const { user, isAuthenticated } = useAuth();
  const [pinStatus, setPinStatus] = useState<'none' | 'set'>('none');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<Array<{credentialId: string; createdAt: string}>>([]);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check PIN status
    const hasPIN = PINUtils.hasPIN(user.id);
    setPinStatus(hasPIN ? 'set' : 'none');

    // Check WebAuthn support and credentials
    const supported = WebAuthnUtils.isSupported();
    setWebAuthnSupported(supported);
    
    if (supported) {
      const credCount = WebAuthnUtils.getCredentialCount(user.id);
      const credInfo = WebAuthnUtils.getCredentialInfo(user.id);
      setWebAuthnCredentials(credInfo || []);
    }
  }, [isAuthenticated, user]);

  const handleSetupPIN = async () => {
    if (!user) return;

    if (pin !== confirmPin) {
      setMessage({ type: 'error', text: 'Los PINs no coinciden' });
      return;
    }

    if (pin.length < 4) {
      setMessage({ type: 'error', text: 'El PIN debe tener al menos 4 dígitos' });
      return;
    }

    try {
      await PINUtils.setupPIN(user.id, pin);
      setPinStatus('set');
      setShowPinSetup(false);
      setPin('');
      setConfirmPin('');
      setMessage({ type: 'success', text: 'PIN configurado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al configurar PIN' });
    }
  };

  const handleRemovePIN = async () => {
    if (!user) return;

    try {
      PINUtils.removePIN(user.id);
      setPinStatus('none');
      setMessage({ type: 'success', text: 'PIN eliminado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar PIN' });
    }
  };

  const handleAddPasskey = async () => {
    if (!user) return;

    try {
      await WebAuthnUtils.register(user.id, user.name || 'Usuario', user.email || '');
      // Refresh credential list
      const credInfo = WebAuthnUtils.getCredentialInfo(user.id);
      setWebAuthnCredentials(credInfo || []);
      setMessage({ type: 'success', text: 'Passkey agregado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al agregar passkey: ' + (error as Error).message });
    }
  };

  const handleRemovePasskey = async (credentialId: string) => {
    if (!user) return;

    try {
      WebAuthnUtils.removeCredential(user.id, credentialId);
      // Refresh credential list
      const credInfo = WebAuthnUtils.getCredentialInfo(user.id);
      setWebAuthnCredentials(credInfo || []);
      setMessage({ type: 'success', text: 'Passkey eliminado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar passkey' });
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p>Debes iniciar sesión para acceder a la configuración de seguridad.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Configuración de Seguridad</h1>
          <p className="text-muted-foreground">Gestiona tus métodos de autenticación</p>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* PIN Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Código PIN
          </CardTitle>
          <CardDescription>
            Configura un PIN de 4-6 dígitos para acceso rápido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={pinStatus === 'set' ? 'default' : 'secondary'}>
                {pinStatus === 'set' ? 'Configurado' : 'No configurado'}
              </Badge>
            </div>
            <div className="flex gap-2">
              {pinStatus === 'none' ? (
                <Button onClick={() => setShowPinSetup(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configurar PIN
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPinSetup(true)}>
                    Cambiar PIN
                  </Button>
                  <Button variant="destructive" onClick={handleRemovePIN}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar PIN
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showPinSetup && (
            <div className="mt-4 p-4 border rounded-lg space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="pin">Nuevo PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Ingresa tu PIN"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="confirm-pin">Confirmar PIN</Label>
                <Input
                  id="confirm-pin"
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirma tu PIN"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSetupPIN}>
                  Guardar PIN
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPinSetup(false);
                  setPin('');
                  setConfirmPin('');
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* WebAuthn/Passkey Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys (WebAuthn)
          </CardTitle>
          <CardDescription>
            Usa Touch ID, Face ID, o llaves de seguridad físicas para autenticación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!webAuthnSupported ? (
            <Alert>
              <AlertDescription>
                Tu navegador no soporta WebAuthn/Passkeys. Actualiza tu navegador o usa un dispositivo compatible.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={webAuthnCredentials.length > 0 ? 'default' : 'secondary'}>
                    {webAuthnCredentials.length} Passkey{webAuthnCredentials.length !== 1 ? 's' : ''} configurado{webAuthnCredentials.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <Button onClick={handleAddPasskey}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Passkey
                </Button>
              </div>

              {webAuthnCredentials.length > 0 && (
                <div className="space-y-2">
                  {webAuthnCredentials.map((cred, index) => (
                    <div key={cred.credentialId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Passkey #{index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            Creado: {new Date(cred.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemovePasskey(cred.credentialId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones de Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Usa un PIN único que no compartas con otras aplicaciones</li>
            <li>• Los Passkeys son más seguros que los PINs - úsalos cuando sea posible</li>
            <li>• Configura múltiples métodos de autenticación como respaldo</li>
            <li>• Tu sesión durará 2 semanas antes de requerir reautenticación</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}