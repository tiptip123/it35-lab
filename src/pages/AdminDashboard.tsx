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
  IonToast,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/react';
import { lockClosedOutline, lockOpenOutline, warningOutline, mailOutline } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useIonRouter } from '@ionic/react';
import './AdminDashboard.css';

interface Incident {
  id: string;
  user_email: string;
  timestamp: string;
  type: string;
  status: string;
  description: string;
  impact_level?: string;
  asset?: string;
  actions?: string;
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

const AdminDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const navigation = useIonRouter();
  const [biaSummary, setBiaSummary] = useState<{ [asset: string]: { [impact: string]: number } }>({});
  const [actionLogs, setActionLogs] = useState<{ [id: string]: string }>({});

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
      // BIA summary calculation
      const summary: { [asset: string]: { [impact: string]: number } } = {};
      data.forEach((inc: Incident) => {
        if (!inc.asset) return;
        if (!summary[inc.asset]) summary[inc.asset] = {};
        const impact = inc.impact_level || 'Unknown';
        summary[inc.asset][impact] = (summary[inc.asset][impact] || 0) + 1;
      });
      setBiaSummary(summary);
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
    try {
      // Use explicit local URL for development
      const { error } = await supabase.auth.resetPasswordForEmail(user_email, {
        redirectTo: 'http://localhost:8100/it35-lab/change-password',
      });

      if (error) {
        if (error.message.includes('429')) {
          setToastMessage('Rate limit exceeded. Please wait a few minutes before trying again.');
        } else {
          setToastMessage(`Error sending reset email: ${error.message}`);
        }
        setShowToast(true);
        return;
      }

      // Mark request as resolved
      await supabase.from('security_incidents').update({ status: 'resolved' }).eq('id', request_id);
      setToastMessage('Reset email sent successfully!');
      setShowToast(true);
      fetchUnlockRequests();
    } catch (err) {
      setToastMessage('An unexpected error occurred. Please try again.');
      setShowToast(true);
    }
  };

  const handleLogout = () => {
    navigation.push('/it35-lab', 'back', 'replace');
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    await supabase.from('security_incidents').update({ status }).eq('id', id);
    fetchIncidents();
  };

  const updateIncidentActions = async (id: string) => {
    const actions = actionLogs[id] || '';
    await supabase.from('security_incidents').update({ actions }).eq('id', id);
    fetchIncidents();
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {incidents.map((incident) => (
                      <div key={incident.id} style={{
                        background: '#181a1b',
                        borderRadius: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        padding: 20,
                        marginBottom: 8,
                        border: '1px solid #23272f',
                        minWidth: 0
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontWeight: 600, fontSize: 18 }}>{incident.type}</span>
                            <IonBadge color={
                              incident.status === 'resolved' ? 'success' :
                              incident.status === 'closed' ? 'medium' :
                              incident.status === 'investigating' ? 'warning' :
                              'danger'
                            } style={{ fontSize: 13, textTransform: 'capitalize' }}>{incident.status}</IonBadge>
                            <span style={{ color: '#888', fontWeight: 500, fontSize: 14 }}>
                              {incident.impact_level || 'N/A'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IonLabel style={{ fontWeight: 500, fontSize: 14 }}>Status:</IonLabel>
                            <IonSelect value={incident.status} onIonChange={e => updateIncidentStatus(incident.id, e.detail.value)} interface="popover" style={{ minWidth: 120 }}>
                              <IonSelectOption value="pending">Pending</IonSelectOption>
                              <IonSelectOption value="investigating">Investigating</IonSelectOption>
                              <IonSelectOption value="contained">Contained</IonSelectOption>
                              <IonSelectOption value="resolved">Resolved</IonSelectOption>
                              <IonSelectOption value="closed">Closed</IonSelectOption>
                            </IonSelect>
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: '#5e72e4' }}>Asset:</span> {incident.asset || 'N/A'}
                          <span style={{ marginLeft: 16, fontWeight: 500, color: '#5e72e4' }}>User:</span> {incident.user_email}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: '#5e72e4' }}>Time:</span> {new Date(incident.timestamp).toLocaleString()}
                        </div>
                        {incident.description && (
                          <div style={{ color: '#aaa', fontStyle: 'italic', marginBottom: 8 }}>{incident.description}</div>
                        )}
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: '#5e72e4' }}>Actions:</span> {incident.actions || <span style={{ color: '#888' }}>None</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
                          <IonTextarea
                            value={actionLogs[incident.id] ?? incident.actions ?? ''}
                            onIonChange={e => setActionLogs({ ...actionLogs, [incident.id]: e.detail.value! })}
                            placeholder="Log actions taken..."
                            autoGrow
                            style={{ background: '#23272f', borderRadius: 8, fontSize: 14, color: '#fff', minHeight: 36, flex: 1 }}
                          />
                          <IonButton size="small" style={{ marginTop: 0, height: 36 }} onClick={() => updateIncidentActions(incident.id)}>
                            Save Actions
                          </IonButton>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <IonCol size="12">
              <h2 className="dashboard-section-title">BIA Summary</h2>
              <IonCard className="dashboard-card">
                <IonCardContent>
                  {Object.keys(biaSummary).length === 0 && <p>No incidents reported yet.</p>}
                  {Object.entries(biaSummary).map(([asset, impacts]) => (
                    <div key={asset} style={{ marginBottom: 12 }}>
                      <b>{asset}</b>
                      <ul>
                        {Object.entries(impacts).map(([impact, count]) => (
                          <li key={impact}>{impact}: {count}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        color="primary"
      />
    </IonPage>
  );
};

export default AdminDashboard; 