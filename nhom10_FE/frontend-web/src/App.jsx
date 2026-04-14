<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPPage from './pages/OTPPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/otp" element={<OTPPage />} />
      </Routes>
    </Router>
  )
}

export default App
=======
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
>>>>>>> toan
