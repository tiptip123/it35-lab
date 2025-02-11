import { 
    IonBackButton,
    IonButtons,
      IonContent, 
      IonHeader, 
      IonMenuButton, 
      IonPage, 
      IonTitle, 
      IonToolbar 
  } from '@ionic/react';
import React from 'react';
  
  const Details: React.FC = () => {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot='start'>
                <IonBackButton defaultHref='/it35-lab/app/home'></IonBackButton>
            </IonButtons>
            <IonTitle>Home Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className='ion-padding'>
        </IonContent>
      </IonPage>
    );
  };
  
  export default Details;