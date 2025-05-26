import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonToast, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/react';
import { supabase } from '../utils/supabaseClient';
import { useIonRouter } from '@ionic/react';

const ChangePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenPresent, setTokenPresent] = useState(false);
  const navigation = useIonRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let accessToken = urlParams.get('access_token');
    let refreshToken = urlParams.get('refresh_token');
    // If not found in query, check hash
    if (!accessToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }
    if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      setTokenPresent(true);
    }
  }, []);

  const handleChangePassword = async () => {
    if (password.length < 6) {
      setToastMessage('Password must be at least 6 characters.');
      setShowToast(true);
      return;
    }
    if (password !== confirmPassword) {
      setToastMessage('Passwords do not match.');
      setShowToast(true);
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      setToastMessage(error.message);
      setShowToast(true);
    } else {
      setToastMessage('Password changed successfully! Redirecting to login...');
      setShowToast(true);
      setTimeout(() => {
        navigation.push('/it35-lab', 'back', 'replace');
      }, 2000);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonCard style={{ maxWidth: 400, margin: '40px auto' }}>
          <IonCardHeader>
            <IonCardTitle>Change Password</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {tokenPresent ? (
              <>
                <IonLabel position="stacked">New Password</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonChange={e => setPassword(e.detail.value!)}
                  placeholder="Enter new password"
                />
                <IonLabel position="stacked" style={{ marginTop: 16 }}>Confirm Password</IonLabel>
                <IonInput
                  type="password"
                  value={confirmPassword}
                  onIonChange={e => setConfirmPassword(e.detail.value!)}
                  placeholder="Confirm new password"
                />
                <IonButton expand="block" style={{ marginTop: 24 }} onClick={handleChangePassword} disabled={isLoading}>
                  {isLoading ? 'Changing...' : 'Change Password'}
                </IonButton>
              </>
            ) : (
              <div style={{ color: 'red', textAlign: 'center' }}>Invalid or expired reset link.</div>
            )}
          </IonCardContent>
        </IonCard>
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color="primary"
        />
      </IonContent>
    </IonPage>
  );
};

export default ChangePassword; 