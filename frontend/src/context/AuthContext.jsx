import React, { createContext, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Synchronously extract and reconstruct user profiles on application initialization
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    // Validate token integrity and register network authorization strings instantly
    const [token, setToken] = useState(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
            // Apply header binding synchronously before rendering components
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            return storedToken;
        }
        return null;
    });

    const login = async (email, password) => {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        const { token: receivedToken, user: userData } = response.data;

        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(userData));

        axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
        setToken(receivedToken);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};