import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const idToken = await currentUser.getIdToken();
                setUser(currentUser);
                setToken(idToken);
                localStorage.setItem('token', idToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
            } else {
                setUser(null);
                setToken(null);
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        setUser(result.user);
        setToken(idToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
        return result.user;
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
    };

    const getFreshToken = async () => {
        if (auth.currentUser) {
            const freshToken = await auth.currentUser.getIdToken(true);
            setToken(freshToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${freshToken}`;
            return freshToken;
        }
        return token;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout, getFreshToken }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};