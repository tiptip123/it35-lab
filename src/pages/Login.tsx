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
import Registration from './Registration';

const Login: React.FC = () => {
  const navigation = useIonRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<{ username: string; password: string; email: string }[]>([]);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const doLogin = () => {
    setShowLoading(true);

    setTimeout(() => {
      const user = registeredUsers.find(
        (user) => user.username === username && user.password === password
      );

      if (user) {
        navigation.push('/it35-lab/app', 'forward', 'replace');
      } else {
        setShowErrorToast(true);
      }
      setShowLoading(false);
    }, 2000);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {showRegistrationForm ? (
          <Registration
            onRegistrationSuccess={() => setShowRegistrationForm(false)}
            onBackToLogin={() => setShowRegistrationForm(false)}
            registeredUsers={registeredUsers}
            setRegisteredUsers={setRegisteredUsers}
          />
        ) : (
          <>
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
              <IonLabel position="floating">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                placeholder="Enter your password"
              />
            </IonItem>

            <IonButton onClick={doLogin} expand="full" className="ion-margin-top">
              Login
            </IonButton>

            <IonButton onClick={() => setShowRegistrationForm(true)} expand="full" className="ion-margin-top" color="secondary">
              Register
            </IonButton>
          </>
        )}

        <IonLoading
          isOpen={showLoading}
          message={'Logging in...'}
          duration={2000}
          onDidDismiss={() => setShowLoading(false)}
        />

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