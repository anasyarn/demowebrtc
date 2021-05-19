import React from 'react';
import {View, StyleSheet, StatusBar, Dimensions} from 'react-native';
import firebase from '../utils/constants/firebase';
import {RTCPeerConnection, RTCView, mediaDevices, RTCSessionDescription} from 'react-native-webrtc';
import {Container, Icon} from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {height, width} = Dimensions.get('screen');
export default class IncomingScreen extends React.Component {
  state = {
    localStream: null,
    remoteStream: null,
    cachedLocalPC: null,
    cachedRemotePC: null,
    offerIceCandidate: null,
    offerLocalDescription: null,
    answerIceCandiate: [],
    answerLocalDescription: null,
    answerRemoteDescription: null,
    isMuted: false,
    isFront: true,
    audio: true,
    video: !this.props.video ? true : this.props.video,
    user: null,
    receiver: null,
    callingId: null,
    callDetails: null,
  };
  async componentDidMount() {
    const {params} = this.props.route;
    const callDetails = params ? params.callDetails : null;
    console.log('calldetails', this.props.route.params);
    // callDetails.key = JSON.parse(params.callKey);
    this.setState({callDetails: callDetails}, async () => {
      try {
        const value = await AsyncStorage.getItem('user');
        if (value !== null) {
          this.setState({user: JSON.parse(value)});
          console.log(JSON.parse(value));
          this.startLocalStream();
        }
      } catch (e) {
        alert(e);
      }
    });
  }
  startLocalStream = async () => {
    // isFront will determine if the initial camera should face user or environment
    const isFront = this.state.isFront;
    const devices = await mediaDevices.enumerateDevices();
    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(
      device => device.kind === 'videoinput' && device.facing === facing,
    );
    const facingMode = isFront ? 'user' : 'environment';
    const constraints = {
      audio: this.state.audio,
      video: this.state.video
        ? {
            height: height,
            width: width,
            facingMode,
            optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
          }
        : false,
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    this.setState({localStream: newStream}, () => {
      this.startCall();
    });
  };
  startCall = async () => {
    // You'll most likely need to use a STUN server at least. Look into TURN and decide if that's necessary for your project
    const configuration = {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
      ],
    };
    const localPC = new RTCPeerConnection(configuration);
    localPC.addStream(this.state.localStream);
    localPC.onaddstream = e => {
      if (e.stream && this.state.remoteStream !== e.stream) {
        this.setState({remoteStream: e.stream});
      }
    };
    try {
      await localPC.setRemoteDescription(
        this.state.callDetails.offerLocalDescription,
      );
      const answer = await localPC.createAnswer();
      await localPC.setLocalDescription(answer);
      try {
        firebase
          .database()
          .ref('/call_manager')
          .child(this.state.callDetails.key)
          .update({answerLocalDescription: answer});
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      console.log(e);
    }

    this.state.callDetails.offerIceCandidate.forEach(data => {
      try {
        localPC.addIceCandidate(data);
      } catch (e) {
        console.log('answer Ice' + e);
      }
    });
    // could also use "addEventListener" for these callbacks, but you'd need to handle removing them as well
    localPC.onicecandidate = e => {
      try {
        if (e.candidate) {
          this.setState(
            {answerIceCandiate: [...this.state.answerIceCandiate, e.candidate]},
            () => {
              try {
                firebase
                  .database()
                  .ref('/call_manager')
                  .child(this.state.callDetails.key)
                  .update({answerIceCandiate: this.state.answerIceCandiate});
              } catch (e) {
                console.log('offerIce:' + e);
              }
            },
          );
        }
      } catch (err) {
        console.error(`Error adding remotePC iceCandidate: ${err}`);
      }
    };
    localPC.onconnectionstatechange = e => {
      console.log(e);
    };
    this.setState({cachedLocalPC: localPC});
  };
  closeStreams = () => {
    const {cachedLocalPC, cachedRemotePC, localStream, remoteStream} =
      this.state;
    if (cachedLocalPC) {
      cachedLocalPC.removeStream(localStream);
      cachedLocalPC.close();
    }
    if (cachedRemotePC) {
      cachedRemotePC.removeStream(remoteStream);
      cachedRemotePC.close();
    }
    this.setState(
      {
        localStream: null,
        remoteStream: null,
        cachedLocalPC: null,
        cachedRemotePC: null,
      },
      () => {
        firebase
          .database()
          .ref('/users/' + this.state.user.uid)
          .update({currentCallId: null})
          .then(() => {
            this.props.navigation.goBack();
          });
      },
    );
  };
  toggleMute = () => {
    const {remoteStream, localStream} = this.state;
    if (!remoteStream) return;
    else {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        this.setState({isMuted: !this.state.isMuted});
      });
    }
  };
  switchCamera = () => {
    const {localStream} = this.state;
    localStream.getVideoTracks().forEach(track => track._switchCamera());
  };
  render() {
    const {localStream, remoteStream, isMuted} = this.state;
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
                    this.toggleMute();
                  }}
                />
              ) : (
                <Icon
                  type="MaterialCommunityIcons"
                  name="microphone"
                  style={{fontSize: 38}}
                  onPress={() => {
                    this.toggleMute();
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
                  this.closeStreams();
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
                  this.switchCamera();
                }}
              />
            </View>
          </View>
        </View>
        <StatusBar backgroundColor="#F77400" barStyle="light-content" />
      </Container>
    );
  }
}

const styles = StyleSheet.create({});
