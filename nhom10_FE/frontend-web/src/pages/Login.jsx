// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import api from '../services/api.service';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth(); // Lấy hàm login từ Context
  const navigate = useNavigate(); // Hook dùng để chuyển trang

  const handleLogin = async (e) => {
    e.preventDefault(); // Ngăn form reload lại trang
    setErrorMsg('');
    setIsSubmitting(true);

   try {
      // 1. Gọi API gửi thông tin đăng nhập lên Backend
      const response = await api.post('/auth/login', { email, password });
      
      // 💡 MẸO: In ra console để xem chính xác Backend trả về chữ 'token' hay 'accessToken', bọc trong 'data' hay không
      console.log("Dữ liệu từ Backend:", response.data);

      // 2. Lấy dữ liệu an toàn (Hỗ trợ cả trường hợp bọc trong 'data' hoặc không)
      const userData = response.data.data?.user || response.data.user;
      
      // Chú ý: Tùy Backend của bạn đặt tên biến là 'token' hay 'accessToken'
      const authToken = response.data.data?.token || response.data.token || response.data.data?.accessToken;

      if (userData && authToken) {
        // 3. Lưu vào AuthContext và LocalStorage
        login(userData, authToken);

        // 4. Chuyển hướng người dùng vào trang chủ
        navigate('/');
      } else {
        // Nếu Backend trả về thành công 200 nhưng không có token
        setErrorMsg('Đăng nhập thành công nhưng thiếu dữ liệu Token!');
      }
      
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập!';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        {/* Tiêu đề */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Đăng nhập
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Chào mừng bạn quay trở lại với hệ thống OTT
          </p>
        </div>

        {/* Báo lỗi nếu có */}
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {/* Giả định có trang Quên mật khẩu */}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Quên mật khẩu?
              </a>
            </div>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-3" 
            isLoading={isSubmitting}
          >
            Đăng nhập ngay
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Đăng ký tại đây
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;