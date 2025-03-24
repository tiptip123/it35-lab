import React, { useState } from 'react';
import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonPage,
    IonTitle,
    IonModal,
    IonText,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonAlert,
} from '@ionic/react';
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

    const handleOpenVerificationModal = () => {
        if (!email.endsWith("@nbsc.edu.ph")) {
            setAlertMessage("Only @nbsc.edu.ph emails are allowed to register.");
            setShowAlert(true);
            return;
        }

        if (password !== confirmPassword) {
            setAlertMessage("Passwords do not match.");
            setShowAlert(true);
            return;
        }

        setShowVerificationModal(true);
    };

    const doRegister = async () => {
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
            // Ensure err is treated as an Error instance
            if (err instanceof Error) {
                setAlertMessage(err.message);
            } else {
                setAlertMessage("An unknown error occurred.");
            }
            setShowAlert(true);
        }
    };
    
    return (
        <IonPage>
            <IonContent className='ion-padding'>
                <h1>Create your account</h1>

                <IonInput label="Username" labelPlacement="stacked" fill="outline" type="text" placeholder="Enter a unique username" value={username} onIonChange={e => setUsername(e.detail.value!)} style={{ marginTop: '15px' }} />
                <IonInput label="First Name" labelPlacement="stacked" fill="outline" type="text" placeholder="Enter your first name" value={firstName} onIonChange={e => setFirstName(e.detail.value!)} style={{ marginTop: '15px' }} />
                <IonInput label="Last Name" labelPlacement="stacked" fill="outline" type="text" placeholder="Enter your last name" value={lastName} onIonChange={e => setLastName(e.detail.value!)} style={{ marginTop: '15px' }} />
                <IonInput label="Email" labelPlacement="stacked" fill="outline" type="email" placeholder="youremail@nbsc.edu.ph" value={email} onIonChange={e => setEmail(e.detail.value!)} style={{ marginTop: '15px' }} />
                <IonInput label="Password" labelPlacement="stacked" fill="outline" type="password" placeholder="Enter password" value={password} onIonChange={e => setPassword(e.detail.value!)} style={{ marginTop: '15px' }} >
                    <IonInputPasswordToggle slot="end" />
                </IonInput>
                <IonInput label="Confirm Password" labelPlacement="stacked" fill="outline" type="password" placeholder="Confirm password" value={confirmPassword} onIonChange={e => setConfirmPassword(e.detail.value!)} style={{ marginTop: '15px' }} >
                    <IonInputPasswordToggle slot="end" />
                </IonInput>

                <IonButton onClick={handleOpenVerificationModal} expand="full" shape='round' style={{ marginTop: '15px' }}>
                    Register
                </IonButton>
                <IonButton routerLink="/it35-lab" expand="full" fill="clear" shape='round'>
                    Already have an account? Sign in
                </IonButton>

                {/* Verification Modal */}
                <IonModal isOpen={showVerificationModal} onDidDismiss={() => setShowVerificationModal(false)}>
                    <IonContent className="ion-padding">
                        <IonCard className="ion-padding" style={{ marginTop: '25%' }}>
                            <IonCardHeader>
                                <IonCardTitle>User Registration Details</IonCardTitle>
                                <hr />
                                <IonCardSubtitle>Username</IonCardSubtitle>
                                <IonCardTitle>{username}</IonCardTitle>

                                <IonCardSubtitle>Email</IonCardSubtitle>
                                <IonCardTitle>{email}</IonCardTitle>

                                <IonCardSubtitle>Name</IonCardSubtitle>
                                <IonCardTitle>{firstName} {lastName}</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent></IonCardContent>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '5px' }}>
                                <IonButton fill="clear" onClick={() => setShowVerificationModal(false)}>Cancel</IonButton>
                                <IonButton color="primary" onClick={doRegister}>Confirm</IonButton>
                            </div>
                        </IonCard>
                    </IonContent>
                </IonModal>

                {/* Success Modal */}
                <IonModal isOpen={showSuccessModal} onDidDismiss={() => setShowSuccessModal(false)}>
                    <IonContent className="ion-padding" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', marginTop: '35%' }}>
                        <IonTitle style={{ marginTop: '35%' }}>Registration Successful 🎉</IonTitle>
                        <IonText>
                            <p>Your account has been created successfully.</p>
                            <p>Please check your email address.</p>
                        </IonText>
                        <IonButton routerLink="/it35-lab" routerDirection="back" color="primary">
                            Go to Login
                        </IonButton>
                    </IonContent>
                </IonModal>

                {/* Reusable AlertBox Component */}
                <AlertBox message={alertMessage} isOpen={showAlert} onClose={() => setShowAlert(false)} />

            </IonContent>
        </IonPage>
    );
};

export default Register;