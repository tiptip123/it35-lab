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
            <IonContent className="ion-padding" color="light">
                <div className="register-container">
                    <div className="register-card">
                        <div className="header-section">
                            <IonButton 
                                fill="clear" 
                                routerLink="/it35-lab" 
                                className="back-button"
                            >
                                <IonIcon icon={arrowBack} slot="start" />
                                Back
                            </IonButton>
                            <div className="logo-container">
                                <IonIcon 
                                    icon={personCircleOutline}
                                    className="logo-icon"
                                />
                            </div>
                            <h1 className="register-title">Create Account</h1>
                            <p className="register-subtitle">Fill in your details to get started</p>
                        </div>

                        <div className="form-group">
                            <IonInput
                                className="custom-input"
                                label="Username" 
                                labelPlacement="floating"
                                fill="outline"
                                type="text"
                                placeholder="Enter a unique username"
                                value={username}
                                onIonChange={e => setUsername(e.detail.value!)}
                                style={{ '--color': '#000000' }}
                            />
                        </div>

                        <div className="name-fields">
                            <div className="form-group half-width">
                                <IonInput
                                    className="custom-input"
                                    label="First Name"
                                    labelPlacement="floating"
                                    fill="outline"
                                    type="text"
                                    placeholder="Enter first name"
                                    value={firstName}
                                    onIonChange={e => setFirstName(e.detail.value!)}
                                    style={{ '--color': '#000000' }}
                                />
                            </div>
                            <div className="form-group half-width">
                                <IonInput
                                    className="custom-input"
                                    label="Last Name"
                                    labelPlacement="floating"
                                    fill="outline"
                                    type="text"
                                    placeholder="Enter last name"
                                    value={lastName}
                                    onIonChange={e => setLastName(e.detail.value!)}
                                    style={{ '--color': '#000000' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <IonInput
                                className="custom-input"
                                label="Email"
                                labelPlacement="floating"
                                fill="outline"
                                type="email"
                                placeholder="youremail@nbsc.edu.ph"
                                value={email}
                                onIonChange={e => setEmail(e.detail.value!)}
                                style={{ '--color': '#000000' }}
                            />
                        </div>

                        <div className="form-group">
                            <IonInput
                                className="custom-input"
                                label="Password"
                                labelPlacement="floating"
                                fill="outline"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onIonChange={e => setPassword(e.detail.value!)}
                                style={{ '--color': '#000000' }}
                            >
                                <IonInputPasswordToggle slot="end" />
                            </IonInput>
                        </div>

                        <div className="form-group">
                            <IonInput
                                className="custom-input"
                                label="Confirm Password"
                                labelPlacement="floating"
                                fill="outline"
                                type="password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onIonChange={e => setConfirmPassword(e.detail.value!)}
                                style={{ '--color': '#000000' }}
                            >
                                <IonInputPasswordToggle slot="end" />
                            </IonInput>
                        </div>

                        <IonButton 
                            className="register-button"
                            onClick={handleOpenVerificationModal}
                            expand="block"
                            shape="round"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </IonButton>

                        <div className="login-link">
                            <IonText>Already have an account?</IonText>
                            <IonButton 
                                routerLink="/it35-lab" 
                                fill="clear" 
                                size="small"
                                className="login-button"
                            >
                                Sign In
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
                            >
                                Go to Login
                            </IonButton>
                        </div>
                    </IonContent>
                </IonModal>

                {/* Reusable AlertBox Component */}
                <AlertBox message={alertMessage} isOpen={showAlert} onClose={() => setShowAlert(false)} />
            </IonContent>

            <style>{`
                .register-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 80vh;
                    padding: 20px;
                }
                
                .register-card {
                    width: 100%;
                    max-width: 500px;
                    background: white;
                    border-radius: 16px;
                    padding: 32px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                }
                
                .header-section {
                    text-align: center;
                    margin-bottom: 24px;
                }
                
                .back-button {
                    --color: #5e72e4;
                    margin-bottom: 16px;
                    align-self: flex-start;
                }
                
                .logo-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                
                .logo-icon {
                    font-size: 64px;
                    color: #5e72e4;
                }
                
                .register-title {
                    color: #2d3748;
                    margin-bottom: 8px;
                    font-size: 24px;
                    font-weight: 600;
                }
                
                .register-subtitle {
                    color: #718096;
                    margin-bottom: 24px;
                    font-size: 14px;
                }
                
                .form-group {
                    margin-bottom: 16px;
                }
                
                .name-fields {
                    display: flex;
                    gap: 16px;
                }
                
                .half-width {
                    flex: 1;
                }
                
                .custom-input {
                    --border-radius: 8px;
                    --border-color: #e2e8f0;
                    --highlight-color-focused: #5e72e4;
                    --color: #000000;
                }
                
                .register-button {
                    --background: #5e72e4;
                    --background-activated: #4a5acf;
                    --background-focused: #4a5acf;
                    --background-hover: #4a5acf;
                    margin-top: 24px;
                    height: 48px;
                    font-weight: 600;
                     --color: #000000; 
                }
                
                .login-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 16px;
                    gap: 4px;
                    color: #000000;
                }
                
                .login-button {
                    --color: #000000;
                    font-size: 14px;
                }
                
                /* Verification Modal Styles */
                .modal-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100%;
                    padding: 20px;
                }
                
                .verification-card {
                    width: 100%;
                    max-width: 500px;
                    border-radius: 16px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                }
                
                .verification-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #2d3748;
                }
                
                .verification-subtitle {
                    color: #718096;
                    font-size: 14px;
                }
                
                .verification-content {
                    padding: 16px;
                }
                
                .detail-item {
                    margin-bottom: 16px;
                }
                
                .detail-label {
                    display: block;
                    color: #718096;
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                
                .detail-value {
                    display: block;
                    color: #2d3748;
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding: 16px;
                    gap: 8px;
                }
                
                .cancel-button {
                    --color: #718096;
                }
                
                .confirm-button {
                    --background: #5e72e4;
                }
                
                /* Success Modal Styles */
                .success-modal {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    height: 100%;
                    padding: 32px;
                }
                
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 24px;
                }
                
                .success-title {
                    color: #2d3748;
                    font-size: 24px;
                    font-weight: 600;
                    margin-bottom: 16px;
                }
                
                .success-message {
                    color: #718096;
                    margin-bottom: 32px;
                }
                
                .success-message p {
                    margin: 8px 0;
                }
                
                .success-button {
                    --background: #5e72e4;
                    width: 100%;
                    max-width: 200px;
                }
            `}</style>
        </IonPage>
    );
};

export default Register;