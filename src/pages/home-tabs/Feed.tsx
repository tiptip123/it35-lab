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
      description: 'Updated facebook cover photo',
      image: 'https://scontent.fmnl14-1.fna.fbcdn.net/v/t39.30808-6/480185159_1150263796500216_1949581681129687712_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeFq1Wrnnkdnn6FE2lAsLBvvvxf49h8G4Ny_F_j2Hwbg3N3qEaVv4d82gh7cVzDvZm1of55A2Ku96vgT6l86c8hx&_nc_ohc=aTy-vif7kX0Q7kNvgFIpHAI&_nc_zt=23&_nc_ht=scontent.fmnl14-1.fna&_nc_gid=A6cWuPgJSjTyuQpx7SHpPUR&oh=00_AYACvHxQ9WxJ_IvZpuQOhFjvDEmN6LjQjnUhzILEUvUmlg&oe=67C59672'
    },
    {
      id: 2,
      title: 'Post 2',
      description: 'Black<3',
      image: 'https://scontent.fmnl14-1.fna.fbcdn.net/v/t39.30808-6/480291595_1147326283460634_6793287484516844899_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeGBoCGbTpNNpYRsTKyFb7mCdMOBIFhF7eF0w4EgWEXt4cgwFn2A6P1FTC-RNKXQUsrKQ4A3WYMKbzRLSvhKaTR4&_nc_ohc=AvOQ9yXHsBcQ7kNvgEO6_jW&_nc_zt=23&_nc_ht=scontent.fmnl14-1.fna&_nc_gid=A0UGNK839gdFBFEVviW2_1Q&oh=00_AYDgHK3CPu5-rSbnxiK8-LF_0I7PW6rfNxbBfF16ceXCEQ&oe=67C5BEBD'
    },
    {
      id: 3,
      title: 'Post 3',
      description: 'kamodelon',
      image: 'https://scontent.fmnl14-1.fna.fbcdn.net/v/t39.30808-6/475977458_1140612497465346_7789292533380226665_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeHA6iNL6vIO02taMs8GcXJzrZnVeQim3K6tmdV5CKbcrkRcSOBHyqf5tJ68gtdPl1Y4U3YuvSzFLm5iOZKDk9Cz&_nc_ohc=CXB68Inw_SsQ7kNvgHrTwgJ&_nc_zt=23&_nc_ht=scontent.fmnl14-1.fna&_nc_gid=AnTksr4lI3jOGfTy4H-s_Vu&oh=00_AYCp-uwZFW0gqwdTgfaG5FhJ23hTI2THQZa7VcJqpbU8hg&oe=67C59E9B'
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