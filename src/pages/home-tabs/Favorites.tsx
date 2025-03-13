import React from 'react';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonImg,
  IonIcon
} from '@ionic/react';
import { heart } from 'ionicons/icons'; // Heart icon for favorites

const Favorites: React.FC = () => {
  // Dummy data for favorite frisbee pictures
  const favoriteItems = [
    {
      id: 1,
      title: 'Frisbee Throw',
      description: 'A perfect frisbee throw in action.',
      image: 'https://live.staticflickr.com/4048/4546736763_45dab7c80c_b.jpg'
    },
    {
      id: 2,
      title: 'Frisbee Catch',
      description: 'An amazing catch during a frisbee game.',
      image: 'https://aphrodite.gmanetwork.com/entertainment/photos/photo/in_photos__derek_ramsay_as_an_athlete_frisbee_1564139499.jpg'
    },
    {
      id: 3,
      title: 'Pilipinas Ultimate',
      description: 'A team celebrating after a frisbee match.',
      image: 'https://sa.kapamilya.com/absnews/abscbnnews/media/2023/life/09/11/philippine-ultimate-national-team.jpg'
    }
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Favorites</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {favoriteItems.length > 0 ? (
          <IonList>
            {favoriteItems.map(item => (
              <IonItem key={item.id}>
                <IonThumbnail slot="start">
                  <IonImg src={item.image} />
                </IonThumbnail>
                <IonLabel>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </IonLabel>
                <IonIcon icon={heart} color="danger" slot="end" /> {/* Heart icon to indicate favorites */}
              </IonItem>
            ))}
          </IonList>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center'
            }}
          >
            <p>No favorites yet. Start adding some!</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Favorites;