import React, {useState, useEffect} from 'react';
import {View, StyleSheet, StatusBar, Dimensions} from 'react-native';
import firebase from '../utils/constants/firebase';
import {RTCPeerConnection, RTCView, mediaDevices} from 'react-native-webrtc';
import {Container, Icon} from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {height, width} = Dimensions.get('screen');

//////

const IncomingScreen = ({navigation, route}) => {
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
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [callingId, setCallingId] = useState(null);
  const [callDetails, setCallDetails] = useState(route.params.callDetails);

  useEffect(async () => {
    try {
      const value = await AsyncStorage.getItem('user');
      if (value !== null) {
        setUser(JSON.parse(value));
        startLocalStream();
      }
    } catch (e) {
      alert(e);
    }
  }, []);


  const startLocalStream = async () => {

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
    startCall(newStream);
  };
  const startCall = async stream => {
    const configuration = {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
      ],
    };
    const localPC = new RTCPeerConnection(configuration);
    localPC.addStream(stream);
    localPC.onaddstream = e => {
      console.log('onaddstream');
      if (e.stream && remoteStream !== e.stream) {
        setRemoteStream(e.stream);
      }
    };
    localPC.onicecandidate = async e => {
      try {
        if (e.candidate != null) {
          let newAnswerIceCandiate = [];
          newAnswerIceCandiate.push(e.candidate);
          await setAnswerIceCandiate(newAnswerIceCandiate);
          console.log(newAnswerIceCandiate);
          try {
            firebase
              .database()
              .ref('/call_manager')
              .child(callDetails.key)
              .update({answerIceCandiate: newAnswerIceCandiate});
          } catch (e) {
            console.log('offerIce:' + e);
          }
        }
      } catch (err) {
        console.error(`Error adding remotePC iceCandidate: ${err}`);
      }
    };
    try {
      await localPC.setRemoteDescription(callDetails.offerLocalDescription);
      const answer = await localPC.createAnswer();
      await localPC.setLocalDescription(answer);
      try {
        firebase
          .database()
          .ref('/call_manager')
          .child(callDetails.key)
          .update({answerLocalDescription: answer});
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      console.log(e);
    }
    callDetails.offerIceCandidate.forEach(async data => {
      try {
        await localPC.addIceCandidate(data);
      } catch (e) {
        console.log('answer Ice' + e);
      }
    });

    localPC.onconnectionstatechange = e => {
      // console.log(e);
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
        .child(user.uid)
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
              mirror={true}
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
              mirror={true}
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

export default IncomingScreen;

const styles = StyleSheet.create({});
