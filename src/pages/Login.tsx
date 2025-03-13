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
  const [email, setEmail] = useState(''); // New state for email
  const [confirmPassword, setConfirmPassword] = useState(''); // New state for confirm password
  const [showLoading, setShowLoading] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showRegistrationLoading, setShowRegistrationLoading] = useState(false);
  const [showRegistrationSuccessToast, setShowRegistrationSuccessToast] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<{ username: string; password: string; email: string }[]>([]); // Store registered users
  const [showRegistrationForm, setShowRegistrationForm] = useState(false); // Track whether to show the registration form

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
    // Validate password and confirm password match
    if (password !== confirmPassword) {
      setShowErrorToast(true);
      setShowRegistrationLoading(false);
      return;
    }

    setShowRegistrationLoading(true); // Show loading indicator

    // Simulate registration process
    setTimeout(() => {
      // Check if the username or email is already taken
      const isUsernameTaken = registeredUsers.some((user) => user.username === username);
      const isEmailTaken = registeredUsers.some((user) => user.email === email);

      if (isUsernameTaken || isEmailTaken) {
        setShowErrorToast(true); // Show error toast if username or email is taken
        setShowRegistrationLoading(false);
        return;
      }

      // Add the new user to the registered users list
      setRegisteredUsers([...registeredUsers, { username, password, email }]);
      setShowRegistrationLoading(false);
      setShowRegistrationSuccessToast(true); // Show success toast
      setShowRegistrationForm(false); // Hide the registration form after successful registration
    }, 2000); // Simulate a 2-second delay for registration
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{showRegistrationForm ? 'Register' : 'Login'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {showRegistrationForm ? (
          // Registration Form
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

            <IonButton onClick={() => setShowRegistrationForm(false)} expand="full" className="ion-margin-top" color="medium">
              Back to Login
            </IonButton>
          </>
        ) : (
          // Login Form
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