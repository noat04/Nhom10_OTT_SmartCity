// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login'; // CHÚ Ý: Import component Login
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return ( 
    <BrowserRouter>
      <Routes>
        
        {/* PUBLIC ROUTES: Phải tồn tại để ProtectedRoute có chỗ đẩy tới */}
        <Route path="/login" element={<Login />} /> 

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
        </Route>

        {/* CATCH-ALL ROUTE */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;