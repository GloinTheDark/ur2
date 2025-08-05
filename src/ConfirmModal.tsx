import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonColor?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    confirmButtonColor = '#ff4444'
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000 // Higher than other modals
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid var(--border-color, #ddd)',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                position: 'relative',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                textAlign: 'center'
            }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1.2rem',
                    color: '#333'
                }}>
                    {title}
                </h3>

                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '1rem',
                    color: '#666',
                    lineHeight: '1.4'
                }}>
                    {message}
                </p>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: '#6c757d',
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#5a6268';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#6c757d';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: confirmButtonColor,
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
