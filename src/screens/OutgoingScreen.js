import React, {useEffect, useState} from 'react';
import {View, StyleSheet, StatusBar, Dimensions} from 'react-native';
import firebase from '../utils/constants/firebase';
import {RTCPeerConnection, RTCView, mediaDevices} from 'react-native-webrtc';
import {Container, Icon} from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
const {height, width} = Dimensions.get('screen');
import {useStateWithCallbackLazy} from 'use-state-with-callback';
///

const OutgoingScreen = ({navigation, route}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [cachedLocalPC, setCachedLocalPC] = useState(null);
  const [cachedRemotePC, setCachedRemotePC] = useState(null);
  const [offerIceCandidate, setOfferIceCandidate] = useState([]);
  const [offerDescription, setofferDescription] = useState(null);
  const [answerIceCandiate, setAnswerIceCandiate] = useState(null);
  const [answerDescription, setAnswerDescription] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFront, setIsFront] = useState(true);
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [sender, setSender] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [callingId, setCallingId] = useState(null);
  useEffect(async () => {
    const {params} = route;
    const receiver = params ? params.receiver : null;
    console.log(params);
    setReceiver(receiver);

    try {
      const value = await AsyncStorage.getItem('user');
      if (value !== null) {
        let nsender = JSON.parse(value);
        setSender(nsender);
        firebase
          .database()
          .ref('/call_manager')
          .push({
            sender: nsender.uid,
            receiver: receiver,
            senderName: nsender.email,
          })
          .then(callback => {
            setCallingId(callback.key);
          })
          .catch(e => {
            alert(e);
          });
      }
    } catch (e) {
      alert(e);
    }
  }, []);
  useEffect(() => {
    startLocalStream();
  }, [callingId]);
  useEffect(() => {
    startCall();
  }, [localStream]);

  const startLocalStream = async () => {
    // isFront will determine if the initial camera should face user or environment

    const devices = await mediaDevices.enumerateDevices();
    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(
      device => device.kind === 'videoinput' && device.facing === facing,
    );
    const facingMode = isFront ? 'user' : 'environment';
    const constraints = {
      audio: audio,
      video: video
        ? {
            height: height,
            width: width,
            facingMode,
            optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
          }
        : false,
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
  };

  const startCall = async () => {
    // You'll most likely need to use a STUN server at least. Look into TURN and decide if that's necessary for your project
    const configuration = {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
      ],
    };
    const localPC = new RTCPeerConnection(configuration);
    console.log('localstream', localStream);
    localPC.addStream(localStream);
    // could also use "addEventListener" for these callbacks, but you'd need to handle removing them as well
    localPC.onicecandidate = async e => {
      try {
        if (e.candidate) {
          let newOfferIceCandidate = [...offerIceCandidate, e.candidate];
          await setOfferIceCandidate(newOfferIceCandidate);
          try {
            firebase
              .database()
              .ref('/call_manager')
              .child(callingId)
              .update({offerIceCandidate: newOfferIceCandidate});
          } catch (e) {
            console.log('offerIce:' + e);
          }
        }
      } catch (err) {
        console.error(`Error adding remotePC iceCandidate: ${err}`);
      }
    };

    const offer = await localPC.createOffer();
    await localPC.setLocalDescription(offer);

    try {
      firebase
        .database()
        .ref('/call_manager')
        .child(callingId)
        .update({offerLocalDescription: offer})
        .then(() => {
          firebase
            .database()
            .ref('/users')
            .child(receiver)
            .update({currentCallingId: callingId});
        });
    } catch (e) {
      console.log(e);
    }
    try {
      firebase
        .database()
        .ref('/call_manager')
        .child(callingId)
        .on('value', async snap => {
          if (snap.val().answerLocalDescription) {
            try {
              localPC.setRemoteDescription(snap.val().answerLocalDescription);
            } catch (e) {
              console.log('answerDesc:' + e);
            }
          }
        });
    } catch (e) {
      console.log(e);
    }
    try {
      firebase
        .database()
        .ref('/call_manager')
        .child(callingId)
        .on('value', snap => {
          if (snap.val().answerIceCandiate) {
            snap.val().answerIceCandiate.forEach(data => {
              localPC.addIceCandidate(data);
            });
          }
        });
    } catch (e) {
      console.log(e);
    }

    localPC.onaddstream = e => {
      if (e.stream && remoteStream !== e.stream) {
        setRemoteStream(e.stream);
      }
    };

    setCachedLocalPC(localPC);
  };

  const closeStreams = () => {
    if (cachedLocalPC) {
      cachedLocalPC.removeStream(localStream);
      cachedLocalPC.close();
    }
    if (cachedRemotePC) {
      cachedRemotePC.removeStream(remoteStream);
      cachedRemotePC.close();
    }
    try {
      firebase
        .database()
        .ref('/users')
        .child(receiver)
        .update({currentCallingId: null})
        .then(() => {
          navigation.goBack();
        });
    } catch (error) {
      alert(error);
    }
  };
  const toggleMute = () => {
    if (!remoteStream) return;
    else {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!isMuted);
      });
    }
  };
  const switchCamera = () => {
    localStream.getVideoTracks().forEach(track => track._switchCamera());
  };
  return (
    <Container>
      <View>
        <View
          style={{
            height: height,
            width: width,
            backgroundColor: 'black',
          }}>
          {remoteStream && (
            <RTCView
              zOrder={-1}
              objectFit={'cover'}
              style={{width: '100%', height: '100%'}}
              streamURL={remoteStream.toURL()}
            />
          )}
        </View>
        <View
          style={{
            height: height * 0.17,
            borderRadius: 5,
            width: width * 0.3,
            backgroundColor: 'grey',
            position: 'absolute',
            top: height * 0.045,
            left: width * 0.03,
          }}>
          {localStream && (
            <RTCView
              zOrder={1}
              objectFit={'cover'}
              style={{height: '100%', width: '100%'}}
              streamURL={localStream.toURL()}
            />
          )}
        </View>
        <View
          style={{
            height: height * 0.2,
            width: width,
            backgroundColor: 'transparent',
            position: 'absolute',
            bottom: 0,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row',
            marginBottom: height * 0.1,
          }}>
          <View
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 100,
              marginLeft: width * 0.15,
            }}>
            {isMuted ? (
              <Icon
                type="MaterialCommunityIcons"
                name="microphone-off"
                style={{fontSize: 38, color: 'red'}}
                onPress={() => {
                  toggleMute();
                }}
              />
            ) : (
              <Icon
                type="MaterialCommunityIcons"
                name="microphone"
                style={{fontSize: 38}}
                onPress={() => {
                  toggleMute();
                }}
              />
            )}
          </View>

          <View
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 100,
            }}>
            <Icon
              name="ios-call"
              style={{color: 'red', fontSize: 38}}
              onPress={() => {
                closeStreams();
              }}
            />
          </View>
          <View
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 100,
              marginRight: width * 0.15,
            }}>
            <Icon
              name="camera-reverse"
              style={{fontSize: 38, color: '#10B83B'}}
              onPress={() => {
                switchCamera();
              }}
            />
          </View>
        </View>
      </View>
      <StatusBar backgroundColor="#F77400" barStyle="light-content" />
    </Container>
  );
};

export default OutgoingScreen;
