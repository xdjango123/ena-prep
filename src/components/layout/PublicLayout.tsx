import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PublicLayoutProps {
    children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow pt-16">{children}</main>
            <Footer />
        </div>
    );
}; 