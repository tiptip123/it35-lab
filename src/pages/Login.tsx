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
  const [showRegistrationLoading, setShowRegistrationLoading] = useState(false);
  const [showRegistrationSuccessToast, setShowRegistrationSuccessToast] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<{ username: string; password: string }[]>([]); // Store registered users

  const doLogin = () => {
    setShowLoading(true); // Show loading indicator

    // Simulate login validation
    setTimeout(() => {
      const user = registeredUsers.find(
        (user) => user.username === username && user.password === password
      );

      if (user) {
        navigation.push('/it35-lab/app', 'forward', 'replace'); // Navigate to the app
      } else {
        setShowErrorToast(true); // Show error toast for invalid credentials
      }
      setShowLoading(false);
    }, 2000); // Simulate a 2-second delay for login
  };

  const doRegister = () => {
    setShowRegistrationLoading(true); // Show loading indicator

    // Simulate registration process
    setTimeout(() => {
      // Check if the username is already taken
      const isUsernameTaken = registeredUsers.some((user) => user.username === username);

      if (isUsernameTaken) {
        setShowErrorToast(true); // Show error toast if username is taken
        setShowRegistrationLoading(false);
        return;
      }

      // Add the new user to the registered users list
      setRegisteredUsers([...registeredUsers, { username, password }]);
      setShowRegistrationLoading(false);
      setShowRegistrationSuccessToast(true); // Show success toast
    }, 2000); // Simulate a 2-second delay for registration
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

        {/* Registration Button */}
        <IonButton onClick={doRegister} expand="full" className="ion-margin-top" color="secondary">
          Register
        </IonButton>

        {/* Login Loading Indicator */}
        <IonLoading
          isOpen={showLoading}
          message={'Logging in...'}
          duration={2000}
          onDidDismiss={() => setShowLoading(false)}
        />

        {/* Registration Loading Indicator */}
        <IonLoading
          isOpen={showRegistrationLoading}
          message={'Registering...'}
          duration={2000}
          onDidDismiss={() => setShowRegistrationLoading(false)}
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message={username ? "Username already taken or invalid credentials!" : "Invalid username or password!"}
          duration={3000}
          color="danger"
        />

        {/* Registration Success Toast */}
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

export default Login;