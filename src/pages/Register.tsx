import React, { useState } from 'react';
import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonPage,
    IonText,
    IonModal,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonAlert,
    IonIcon
} from '@ionic/react';
import { personCircleOutline, arrowBack } from 'ionicons/icons';
import { supabase } from '../utils/supabaseClient';
import bcrypt from 'bcryptjs';

// Reusable Alert Component
const AlertBox: React.FC<{ message: string; isOpen: boolean; onClose: () => void }> = ({ message, isOpen, onClose }) => {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header="Notification"
      message={message}
      buttons={['OK']}
    />
  );
};

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenVerificationModal = () => {
        if (password !== confirmPassword) {
            setAlertMessage("Passwords do not match.");
            setShowAlert(true);
            return;
        }
        setShowVerificationModal(true);
    };

    const doRegister = async () => {
        setIsLoading(true);
        setShowVerificationModal(false);
    
        try {
            // Sign up in Supabase authentication
            const { data, error } = await supabase.auth.signUp({ email, password });
    
            if (error) {
                throw new Error("Account creation failed: " + error.message);
            }
    
            // Hash password before storing in the database
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            // Insert user data into 'users' table
            const { error: insertError } = await supabase.from("users").insert([
                {
                    username,
                    user_email: email,
                    user_firstname: firstName,
                    user_lastname: lastName,
                    user_password: hashedPassword,
                },
            ]);
    
            if (insertError) {
                throw new Error("Failed to save user data: " + insertError.message);
            }
    
            setShowSuccessModal(true);
        } catch (err) {
            if (err instanceof Error) {
                setAlertMessage(err.message);
            } else {
                setAlertMessage("An unknown error occurred.");
            }
            setShowAlert(true);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <IonPage>
            <IonContent className="login-gradient-bg" fullscreen>
                <div className="login-center-container">
                    <div className="login-card-modern">
                        <div className="login-user-icon">
                            <IonIcon icon={personCircleOutline} style={{ fontSize: 90, color: '#fff' }} />
                        </div>
                        <h2 className="login-title-modern">Create Account</h2>
                        <input
                            className="login-input-modern"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                        <div className="register-name-row">
                            <input
                                className="login-input-modern half-width"
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                            />
                            <input
                                className="login-input-modern half-width"
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                            />
                        </div>
                        <input
                            className="login-input-modern"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            className="login-input-modern"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <input
                            className="login-input-modern"
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <button
                            className="login-btn-modern"
                            type="button"
                            onClick={handleOpenVerificationModal}
                            disabled={isLoading}
                        >
                            CREATE ACCOUNT
                        </button>
                        <div className="register-link-modern">
                            Already have an account? 
                            <IonButton fill="clear" routerLink="/it35-lab" routerDirection="back" style={{ padding: 0, minHeight: 0, minWidth: 0, height: 'auto', fontSize: 'inherit', color: '#fff', textTransform: 'none' }}>
                              SIGN IN
                            </IonButton>
                        </div>
                    </div>
                </div>

                {/* Verification Modal */}
                <IonModal isOpen={showVerificationModal} onDidDismiss={() => setShowVerificationModal(false)}>
                    <IonContent className="ion-padding" color="light">
                        <div className="modal-container">
                            <IonCard className="verification-card">
                                <IonCardHeader>
                                    <IonCardTitle className="verification-title">Confirm Details</IonCardTitle>
                                    <IonCardSubtitle className="verification-subtitle">Please verify your information before submitting</IonCardSubtitle>
                                </IonCardHeader>

                                <IonCardContent className="verification-content">
                                    <div className="detail-item">
                                        <IonText className="detail-label">Username:</IonText>
                                        <IonText className="detail-value">{username}</IonText>
                                    </div>
                                    <div className="detail-item">
                                        <IonText className="detail-label">Email:</IonText>
                                        <IonText className="detail-value">{email}</IonText>
                                    </div>
                                    <div className="detail-item">
                                        <IonText className="detail-label">Full Name:</IonText>
                                        <IonText className="detail-value">{firstName} {lastName}</IonText>
                                    </div>
                                </IonCardContent>

                                <div className="modal-actions">
                                    <IonButton 
                                        fill="clear" 
                                        onClick={() => setShowVerificationModal(false)}
                                        className="cancel-button"
                                    >
                                        Edit Details
                                    </IonButton>
                                    <IonButton 
                                        color="primary" 
                                        onClick={doRegister}
                                        className="confirm-button"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Creating Account...' : 'Confirm'}
                                    </IonButton>
                                </div>
                            </IonCard>
                        </div>
                    </IonContent>
                </IonModal>

                {/* Success Modal */}
                <IonModal isOpen={showSuccessModal} onDidDismiss={() => setShowSuccessModal(false)}>
                    <IonContent className="ion-padding" color="light">
                        <div className="success-modal">
                            <div className="success-icon">🎉</div>
                            <h2 className="success-title">Registration Successful!</h2>
                            <IonText className="success-message">
                                <p>Your account has been created successfully.</p>
                                <p>Please check your email for verification.</p>
                            </IonText>
                            <IonButton 
                                routerLink="/it35-lab" 
                                routerDirection="back" 
                                className="success-button"
                                fill="clear"
                                style={{ color: '#1976d2', fontWeight: 'bold', textTransform: 'none' }}
                            >
                                Go to Login
                            </IonButton>
                        </div>
                    </IonContent>
                </IonModal>

                {/* Reusable AlertBox Component */}
                <AlertBox message={alertMessage} isOpen={showAlert} onClose={() => setShowAlert(false)} />
            </IonContent>
        </IonPage>
    );
};

export default Register;