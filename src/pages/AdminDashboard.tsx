import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { lockClosedOutline, lockOpenOutline, warningOutline, mailOutline } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useIonRouter } from '@ionic/react';
import './AdminDashboard.css';
import emailjs from '@emailjs/browser';

interface Incident {
  id: string;
  user_email: string;
  timestamp: string;
  type: string;
  status: string;
  description: string;
}

interface LockedUser {
  id: string;
  email: string;
  locked_at: string;
  attempts: number;
}

interface UnlockRequest extends Incident {
  // Inherits all fields from Incident
}

const EMAILJS_SERVICE_ID = 'service_o27s838';
const EMAILJS_TEMPLATE_ID = 'template_iqihl2r';
const EMAILJS_PUBLIC_KEY = 'i2lhDcM-RtILyFyLv';

const sendResetEmail = async (toEmail: string, resetLink: string) => {
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      link: resetLink,
    },
    EMAILJS_PUBLIC_KEY
  );
};

const sendTest = () => {
  emailjs.send(
    'service_o27s838',
    'template_iqihl2r',
    { link: 'https://example.com' },
    'i2lhDcM-RtILyFyLv'
  ).then(
    (result) => { alert('Email sent!'); },
    (error) => { alert('Failed: ' + error.text); }
  );
};

const AdminDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const navigation = useIonRouter();

  useEffect(() => {
    fetchIncidents();
    fetchLockedUsers();
    fetchUnlockRequests();
  }, []);

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from('security_incidents')
      .select('*')
      .order('timestamp', { ascending: false });

    if (data) {
      setIncidents(data);
    }
  };

  const fetchLockedUsers = async () => {
    const { data, error } = await supabase
      .from('locked_users')
      .select('*')
      .order('locked_at', { ascending: false });

    if (data) {
      setLockedUsers(data);
    }
  };

  const fetchUnlockRequests = async () => {
    const { data } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('type', 'Unlock Request')
      .eq('status', 'pending')
      .order('timestamp', { ascending: false });
    if (data) setUnlockRequests(data);
  };

  const unlockUser = async (userId: string) => {
    const { error } = await supabase
      .from('locked_users')
      .delete()
      .eq('id', userId);

    if (!error) {
      fetchLockedUsers();
    }
  };

  const handleSendResetEmail = async (user_email: string, request_id: string) => {
    // Use Supabase Auth to send password reset email with the correct deployed URL and hash routing
    await supabase.auth.resetPasswordForEmail(user_email, {
      redirectTo: 'https://tiptip123.github.io/it35-lab/#/change-password',
    });
    // Mark request as resolved
    await supabase.from('security_incidents').update({ status: 'resolved' }).eq('id', request_id);
    fetchUnlockRequests();
  };

  const handleLogout = () => {
    navigation.push('/it35-lab', 'back', 'replace');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButton slot="end" color="danger" onClick={handleLogout}>
            Logout
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding admin-dashboard-bg">
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <h2 className="dashboard-section-title"><IonIcon icon={mailOutline} /> Unlock Requests</h2>
              <IonCard className="dashboard-card">
                <IonCardContent>
                  <IonList>
                    {unlockRequests.length === 0 && (
                      <IonItem>No unlock requests.</IonItem>
                    )}
                    {unlockRequests.map((req) => (
                      <IonItem key={req.id}>
                        <IonLabel>
                          <h2>{req.user_email}</h2>
                          <p>{new Date(req.timestamp).toLocaleString()}</p>
                        </IonLabel>
                        <IonButton color="success" onClick={() => handleSendResetEmail(req.user_email, req.id)}>
                          Send Reset Email
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <h2 className="dashboard-section-title"><IonIcon icon={warningOutline} /> Security Incidents</h2>
              <IonCard className="dashboard-card">
                <IonCardContent>
                  <IonList>
                    {incidents.map((incident) => (
                      <IonItem key={incident.id}>
                        <IonLabel>
                          <h2>{incident.type}</h2>
                          <p>{incident.user_email}</p>
                          <p>{new Date(incident.timestamp).toLocaleString()}</p>
                          {incident.description && (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>{incident.description}</p>
                          )}
                        </IonLabel>
                        <IonBadge color={incident.status === 'resolved' ? 'success' : 'warning'}>
                          {incident.status}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <h2 className="dashboard-section-title"><IonIcon icon={lockClosedOutline} /> Locked Users</h2>
              <IonCard className="dashboard-card">
                <IonCardContent>
                  <IonList>
                    {lockedUsers.map((user) => (
                      <IonItem key={user.id}>
                        <IonLabel>
                          <h2>{user.email}</h2>
                          <p>Locked at: {new Date(user.locked_at).toLocaleString()}</p>
                          <p>Failed attempts: {user.attempts}</p>
                        </IonLabel>
                        <IonButton
                          fill="clear"
                          onClick={() => unlockUser(user.id)}
                        >
                          <IonIcon icon={lockOpenOutline} slot="start" />
                          Unlock
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard; 