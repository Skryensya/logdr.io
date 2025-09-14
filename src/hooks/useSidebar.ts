"use client";

import { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

export type SidebarForm = 'account' | 'transaction' | 'category' | null;

export interface SidebarState {
  isOpen: boolean;
  form: SidebarForm;
  editId?: string;
  data?: any;
}

export interface SidebarActions {
  openForm: (form: SidebarForm, editId?: string, data?: any) => void;
  closeForm: () => void;
}

export function useSidebar(): SidebarState & SidebarActions {
  const [state, setState] = useState<SidebarState>({
    isOpen: false,
    form: null,
  });

  const openForm = useCallback((form: SidebarForm, editId?: string, data?: any) => {
    logger.info('Opening form:', { form, editId, data });
    setState({
      isOpen: true,
      form,
      editId,
      data,
    });
  }, []);

  const closeForm = useCallback(() => {
    setState({
      isOpen: false,
      form: null,
      editId: undefined,
      data: undefined,
    });
  }, []);

  return {
    ...state,
    openForm,
    closeForm,
  };
}