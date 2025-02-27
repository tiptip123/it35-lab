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
      title: 'Frisbee Team',
      description: 'A team celebrating after a frisbee match.',
      image: 'https://scontent.fmnl14-1.fna.fbcdn.net/v/t39.30808-6/475306403_122125121852594882_1702794426792714697_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeHq3n4BPdTnn1NEV5EZ6VvE3bhjmiwdbDfduGOaLB1sNyOX6A1_njmzGQBaPtxdZIkguL12NhL7eTRzbKC7Xni7&_nc_ohc=GZ7Tn_IA7lAQ7kNvgHQG7_H&_nc_zt=23&_nc_ht=scontent.fmnl14-1.fna&_nc_gid=A3r39QqtzlvmQcXAodpH1Sm&oh=00_AYA-6Cf8oeW801Uz5nKDtEKJciwBonBKNydObZijPFt0Pg&oe=67C5A297'
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