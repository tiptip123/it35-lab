import React, { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonItem,
  IonLoading,
  IonToast,
} from '@ionic/react';

interface RegistrationProps {
  onRegistrationSuccess: () => void;
  onBackToLogin: () => void;
  registeredUsers: { username: string; password: string; email: string }[];
  setRegisteredUsers: (users: { username: string; password: string; email: string }[]) => void;
}

const Registration: React.FC<RegistrationProps> = ({
  onRegistrationSuccess,
  onBackToLogin,
  registeredUsers,
  setRegisteredUsers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegistrationLoading, setShowRegistrationLoading] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showRegistrationSuccessToast, setShowRegistrationSuccessToast] = useState(false);

  const doRegister = () => {
    if (password !== confirmPassword) {
      setShowErrorToast(true);
      setShowRegistrationLoading(false);
      return;
    }

    setShowRegistrationLoading(true);

    setTimeout(() => {
      const isUsernameTaken = registeredUsers.some((user) => user.username === username);
      const isEmailTaken = registeredUsers.some((user) => user.email === email);

      if (isUsernameTaken || isEmailTaken) {
        setShowErrorToast(true);
        setShowRegistrationLoading(false);
        return;
      }

      setRegisteredUsers([...registeredUsers, { username, password, email }]);
      setShowRegistrationLoading(false);
      setShowRegistrationSuccessToast(true);
      onRegistrationSuccess();
    }, 2000);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Register</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="floating">Username</IonLabel>
          <IonInput
            type="text"
            value={username}
            onIonChange={(e) => setUsername(e.detail.value!)}
            placeholder="Enter your username"
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonChange={(e) => setEmail(e.detail.value!)}
            placeholder="Enter your email"
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Password</IonLabel>
          <IonInput
            type="password"
            value={password}
            onIonChange={(e) => setPassword(e.detail.value!)}
            placeholder="Enter your password"
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Confirm Password</IonLabel>
          <IonInput
            type="password"
            value={confirmPassword}
            onIonChange={(e) => setConfirmPassword(e.detail.value!)}
            placeholder="Confirm your password"
          />
        </IonItem>

        <IonButton onClick={doRegister} expand="full" className="ion-margin-top" color="secondary">
          Register
        </IonButton>

        <IonButton onClick={onBackToLogin} expand="full" className="ion-margin-top" color="medium">
          Back to Login
        </IonButton>

        <IonLoading
          isOpen={showRegistrationLoading}
          message={'Registering...'}
          duration={2000}
          onDidDismiss={() => setShowRegistrationLoading(false)}
        />

        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message={
            password !== confirmPassword
              ? "Passwords do not match!"
              : username || email
              ? "Username or email already taken!"
              : "Invalid username or password!"
          }
          duration={3000}
          color="danger"
        />

        <IonToast
          isOpen={showRegistrationSuccessToast}
          onDidDismiss={() => setShowRegistrationSuccessToast(false)}
          message="Registration successful! You can now log in."
          duration={3000}
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default Registration;