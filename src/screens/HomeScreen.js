import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  BackHandler,
  Alert,
  StatusBar,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {Button, Container, Content, Header, Icon, ListItem} from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../utils/constants/firebase';
const HomeScreen = ({navigation}) => {
  const handleLogOut = async () => {
    await AsyncStorage.removeItem('user');
    BackHandler.exitApp();
  };
  const [users, setUsers] = useState([]);
  const [userData, setUserData] = useState([]);
  const [callDetails, setCallDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  useEffect(async () => {
    try {
      const value = await AsyncStorage.getItem('user');
      if (value !== null) {
        setUserData(JSON.parse(value));
        getCallStatus(JSON.parse(value));
        getUsers(JSON.parse(value));
      }
    } catch (e) {
      alert(e);
    }
  }, []);

  const getUsers = user => {
    setLoading(true);
    firebase
      .database()
      .ref('/users')
      .once('value', snap => {
        let arr = Object.entries(snap.val());
        const myIndex = arr.findIndex(obj => obj[1].firebaseUid === user.uid);
        console.log(myIndex);
        arr.splice(myIndex, 1);
        setUsers(arr);
        setLoading(false);
        setRefreshing(false);
      });
  };

  const getCallStatus = user => {
    console.log(user.uid);
    try {
      firebase
        .database()
        .ref('/users/' + user.uid)
        .child('currentCallingId')
        .on('value', snap => {
          if (snap.val() !== null) {
            console.log('lol', snap.val());
            try {
              firebase
                .database()
                .ref('/call_manager/' + snap.val())
                .once('value', snapshot => {
                  if (snapshot.val().offerIceCandidate) {
                    setCallDetails(snapshot.val());
                    setIncomingCall(true);
                    console.log('homecalldetails', snapshot.key);
                    if (incomingCall) {
                      Alert.alert(
                        'Incoming Call',
                        snapshot.val().senderName,
                        [
                          {
                            text: 'Answer',
                            onPress: () => {
                              setIncomingCall(false);
                              navigation.navigate('Incoming', {
                                callDetails: {
                                  key: snapshot.key,
                                  offerIceCandidate:
                                    snapshot.val().offerIceCandidate,
                                  offerLocalDescription:
                                    snapshot.val().offerLocalDescription,
                                  revceiver: snapshot.val().receiver,
                                  sender: snapshot.val().sender,
                                  senderName: snapshot.val().senderName,
                                },
                              });
                            },
                          },
                          {text: ''},
                          {
                            text: 'Reject',
                            onPress: () => {
                              setIncomingCall(false);
                              firebase
                                .database()
                                .ref('/users/' + user.uid)
                                .update({currentCallingId: null});
                            },
                          },
                        ],
                        {cancelable: false},
                      );
                    }
                  }
                });
            } catch (error) {
              console.log(error);
            }
          }
        });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Container>
      <Header
        style={{
          backgroundColor: 'white',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Text style={{color: 'grey', fontSize: 16}}>{userData.email}</Text>
        <Icon
          name="ios-exit-outline"
          style={{color: 'grey', marginRight: 10}}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure to logout and exit the app?', [
              {
                text: 'Cancel',
                onPress: () => console.log('Cancel Pressed'),
                style: 'cancel',
              },
              {text: 'OK', onPress: () => handleLogOut()},
            ]);
          }}
        />
      </Header>
      {loading ? (
        <ActivityIndicator color="grey" style={{marginTop: '50%'}} />
      ) : (
        <FlatList
          data={users}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            getUsers(userData);
            getCallStatus(userData);
          }}
          renderItem={({item}) => {
            return (
              <ListItem style={{justifyContent: 'space-between'}} key={item[0]}>
                <View style={{flexDirection: 'column'}}>
                  <Text>{item[1].name}</Text>
                  <Text style={{fontSize: 14}}>{item[1].email}</Text>
                </View>
                <Button
                  style={{
                    width: '20%',
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    navigation.navigate('Outgoing', {
                      receiver: item[1].firebaseUid,
                    });
                  }}>
                  <Text style={{color: 'white'}}>Call</Text>
                </Button>
              </ListItem>
            );
          }}
          keyExtractor={item => item[0]}
        />
      )}

      <StatusBar backgroundColor="white" barStyle="dark-content" />
    </Container>
  );
};

export default HomeScreen;
