'use client';

import React, { useState, useEffect } from 'react';
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {
  CheckCircle as SuccessIcon,
  XCircle as ErrorIcon,
  AlertTriangle as WarningIcon,
  Info as InfoIcon
} from "lucide-react";

export default function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable={false}
      pauseOnHover={false}
      theme="light"
      icon={({ type }) => {
        switch (type) {
          case "success": return <SuccessIcon size={20} />;
          case "error": return <ErrorIcon size={20} />;
          case "warning": return <WarningIcon size={20} />;
          case "info": return <InfoIcon size={20} />;
          default: return <InfoIcon size={20} />;
        }
      }}
    />
  );
}
