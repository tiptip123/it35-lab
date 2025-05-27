import React, { useState, useEffect } from 'react';
import {
  IonButton,
  IonModal,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  useIonToast
} from '@ionic/react';
import { supabase } from '../utils/supabaseClient';

interface Asset {
  id: string;
  name: string;
}

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const IncidentReportModal: React.FC<IncidentReportModalProps> = ({ isOpen, onClose, userEmail }) => {
  const [incidentType, setIncidentType] = useState('Phishing');
  const [impactLevel, setImpactLevel] = useState('Low');
  const [asset, setAsset] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [present] = useIonToast();

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('assets').select('*');
      if (data) setAssets(data);
    };
    fetchAssets();
  }, []);

  const reportIncident = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from('security_incidents')
      .insert([
        {
          user_email: userEmail || '',
          type: incidentType,
          status: 'pending',
          description: incidentDescription,
          impact_level: impactLevel,
          asset: asset,
          timestamp: new Date().toISOString()
        }
      ]);
    setIsLoading(false);
    if (!error) {
      present({ message: 'Incident reported successfully!', duration: 2000, color: 'success' });
      onClose();
      setIncidentDescription('');
      setAsset('');
      setIncidentType('Phishing');
      setImpactLevel('Low');
    } else {
      present({ message: 'Failed to report incident.', duration: 2000, color: 'danger' });
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} backdropDismiss={!isLoading}>
      <IonCard style={{ margin: 0, boxShadow: 'none', background: '#181a20', color: '#fff' }}>
        <IonCardHeader>
          <IonCardTitle>Report Security Incident</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonLabel position="stacked">Incident Type</IonLabel>
          <IonSelect value={incidentType} onIonChange={e => setIncidentType(e.detail.value)}>
            <IonSelectOption value="Phishing">Phishing</IonSelectOption>
            <IonSelectOption value="Data Breach">Data Breach</IonSelectOption>
            <IonSelectOption value="Unauthorized Access">Unauthorized Access</IonSelectOption>
            <IonSelectOption value="Malware">Malware</IonSelectOption>
            <IonSelectOption value="Other">Other</IonSelectOption>
          </IonSelect>
          <IonLabel position="stacked" style={{ marginTop: 16 }}>Impact Level</IonLabel>
          <IonSelect value={impactLevel} onIonChange={e => setImpactLevel(e.detail.value)}>
            <IonSelectOption value="Low">Low</IonSelectOption>
            <IonSelectOption value="Medium">Medium</IonSelectOption>
            <IonSelectOption value="High">High</IonSelectOption>
            <IonSelectOption value="Critical">Critical</IonSelectOption>
          </IonSelect>
          <IonLabel position="stacked" style={{ marginTop: 16 }}>Affected Asset</IonLabel>
          <IonSelect value={asset} onIonChange={e => setAsset(e.detail.value)}>
            {assets.map(a => (
              <IonSelectOption key={a.id} value={a.name}>{a.name}</IonSelectOption>
            ))}
          </IonSelect>
          <IonLabel position="stacked" style={{ marginTop: 16 }}>Description</IonLabel>
          <IonTextarea value={incidentDescription} onIonChange={e => setIncidentDescription(e.detail.value!)} />
          <IonButton expand="block" style={{ marginTop: 24 }} onClick={reportIncident} disabled={isLoading}>
            {isLoading ? 'Reporting...' : 'Report Incident'}
          </IonButton>
          <IonButton expand="block" fill="clear" color="medium" onClick={onClose} disabled={isLoading} style={{ marginTop: 8 }}>
            Cancel
          </IonButton>
        </IonCardContent>
      </IonCard>
    </IonModal>
  );
};

export default IncidentReportModal; 