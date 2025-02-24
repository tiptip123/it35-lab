import { 
    IonButtons,
      IonContent, 
      IonHeader, 
      IonMenuButton, 
      IonPage, 
      IonSearchbar, 
      IonTitle, 
      IonToolbar 
  } from '@ionic/react';
  
  const Search: React.FC = () => {
    return (
      <>
        <IonSearchbar color="dark" placeholder="Search"></IonSearchbar>
      </>
    );
  } 
  export default Search;