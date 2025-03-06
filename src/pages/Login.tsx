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

const Login: React.FC = () => {
  const navigation = useIonRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const doLogin = () => {
    // Simulate login validation
    if (username === 'admin' && password === 'password') {
      setShowLoading(true); // Show loading indicator
      setTimeout(() => {
        setShowLoading(false);
        navigation.push('/it35-lab/app', 'forward', 'replace'); // Navigate to the app
      }, 2000); // Simulate a 2-second delay for login
    } else {
      setShowErrorToast(true); // Show error toast for invalid credentials
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
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

        {/* Login Button */}
        <IonButton onClick={doLogin} expand="full" className="ion-margin-top">
          Login
        </IonButton>

        {/* Loading Indicator */}
        <IonLoading
          isOpen={showLoading}
          message={'Logging in...'}
          duration={2000}
          onDidDismiss={() => setShowLoading(false)}
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message="Invalid username or password!"
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;