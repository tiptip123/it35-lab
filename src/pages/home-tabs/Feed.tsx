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
  IonImg
} from '@ionic/react';

const Feed: React.FC = () => {
  // Dummy data for the feed
  const feedItems = [
    {
      id: 1,
      title: 'Post 1',
      description: 'My life status?',
      image: 'https://media.themoviedb.org/t/p/w235_and_h235_face/eYO7i5GBM1hqEWkifKJM4mVGKeQ.jpg'
    },
    {
      id: 2,
      title: 'Post 2',
      description: 'Black<3',
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Jose_Rizal_full.jpg'
    },
    {
      id: 3,
      title: 'Post 3',
      description: 'kamodelon',
      image: 'https://live.staticflickr.com/3116/3106511157_8954c51133_z.jpg'
    }
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Feed</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList>
          {feedItems.map(item => (
            <IonItem key={item.id}>
              <IonThumbnail slot="start">
                <IonImg src={item.image} />
              </IonThumbnail>
              <IonLabel>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Feed;