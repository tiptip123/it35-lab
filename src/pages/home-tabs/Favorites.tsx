import { 
  IonButton,
    IonButtons,
      IonContent, 
      IonHeader, 
      IonItem, 
      IonList, 
      IonMenuButton, 
      IonPage, 
      IonPopover, 
      IonTitle, 
      IonToggle, 
      IonToolbar 
  } from '@ionic/react';

  const Feed: React.FC = () => {
    return (
      <>
        <IonButton id="popover-button">Is Lester Gay?</IonButton>
        <IonPopover trigger="popover-button" dismissOnSelect={true}>
          <IonContent>
            <IonList>
              <IonItem button={true} detail={false}>
                YES
              </IonItem>
              <IonItem button={true} detail={false}>
                !NO
              </IonItem>
              <IonItem button={true} id="nested-trigger">
                More options...
              </IonItem>
  
              <IonPopover trigger="nested-trigger" dismissOnSelect={true} side="end">
                <IonContent>
                  <IonList>
                    <IonItem button={true} detail={false}>
                      YES
                    </IonItem>
                  </IonList>
                </IonContent>
              </IonPopover>
            </IonList>
          </IonContent>
        </IonPopover>
      </>
    );
  }
  export default Feed;