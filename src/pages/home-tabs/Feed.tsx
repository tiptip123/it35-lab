import { 
  IonButton,
    IonButtons,
      IonContent, 
      IonHeader, 
      IonImg, 
      IonItem, 
      IonLabel, 
      IonMenuButton, 
      IonPage, 
      IonPopover, 
      IonSpinner, 
      IonTitle, 
      IonToolbar 
  } from '@ionic/react';
  
  const Feed: React.FC = () => {
    return (
      <>
        <IonButton id="trigger-button">Click to show my talent</IonButton>
        <IonPopover trigger="trigger-button">
        <IonImg
      src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEizui-Xki4xzKaq56qwxVbEHwronyXj7yizh1p1xoK11qTw9J3ZDJlYDrqqpFHC0RGUIDAAkLBRytXFX_ZzneQBB2wi6e-8tA2VlfIyt3TiGEJi-yflM8SnxO3zYIDFAt-gHCQv0Qa5il0/s1600/Derek2.jpg"
      alt="The Wisconsin State Capitol building in Madison, WI at night"
    ></IonImg>
        </IonPopover>
      </>
    );
  }
  
  export default Feed;