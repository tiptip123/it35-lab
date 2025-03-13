import React, { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
  IonLabel,
  IonItem,
  IonLoading,
  IonToast,
} from '@ionic/react';

const Registration: React.FC = () => {
  const navigation = useIonRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const doRegister = () => {
    // Simulate registration process
    if (username && password && email) {
      setShowLoading(true); // Show loading indicator
      setTimeout(() => {
        setShowLoading(false);
        setShowSuccessToast(true); // Show success toast
        setTimeout(() => {
          navigation.push('/login', 'back', 'replace'); // Navigate back to login after success
        }, 2000); // Wait 2 seconds before navigating
      }, 2000); // Simulate a 2-second delay for registration
    } else {
      setShowErrorToast(true); // Show error toast for invalid input
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Registration</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Username Input */}
        <IonItem>
          <IonLabel position="floating">Username</IonLabel>
          <IonInput
            type="text"
            value={username}
            onIonChange={(e) => setUsername(e.detail.value!)}
            placeholder="Enter your username"
          />
        </IonItem>

        {/* Email Input */}
        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonChange={(e) => setEmail(e.detail.value!)}
            placeholder="Enter your email"
          />
        </IonItem>

        {/* Password Input */}
        <IonItem>
          <IonLabel position="floating">Password</IonLabel>
          <IonInput
            type="password"
            value={password}
            onIonChange={(e) => setPassword(e.detail.value!)}
            placeholder="Enter your password"
          />
        </IonItem>

        {/* Register Button */}
        <IonButton onClick={doRegister} expand="full" className="ion-margin-top">
          Register
        </IonButton>

        {/* Back to Login Button */}
        <IonButton
          onClick={() => navigation.push('/login', 'back', 'replace')}
          expand="full"
          className="ion-margin-top"
          color="medium"
        >
          Back to Login
        </IonButton>

        {/* Loading Indicator */}
        <IonLoading
          isOpen={showLoading}
          message={'Registering...'}
          duration={2000}
          onDidDismiss={() => setShowLoading(false)}
        />

        {/* Success Toast */}
        <IonToast
          isOpen={showSuccessToast}
          onDidDismiss={() => setShowSuccessToast(false)}
          message="Registration successful! Redirecting to login..."
          duration={3000}
          color="success"
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message="Please fill in all fields!"
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default Registration;