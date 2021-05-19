import React, {Component, useState} from 'react';
import {
  Text,
  View,
  Dimensions,
  StatusBar,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Content,
  Container,
  Header,
  Icon,
  Button,
  Picker,
  Input,
  Toast,
} from 'native-base';

const {height, width} = Dimensions.get('window');
const proportional = (height * width) / height + width;
import AsyncStorage from '@react-native-async-storage/async-storage';
import {CommonActions} from '@react-navigation/native';
import firebase from '../utils/constants/firebase';
const SignUp = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repass, setRepass] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = (email, password) => {
    if (email == '') {
      Toast.show({
        text: 'Enter email',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    if (password == '') {
      Toast.show({
        text: 'Enter password',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    try {
      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(async user => {
          if (user) {
            console.log(user);
            try {
              await AsyncStorage.setItem('user', JSON.stringify(user.user));
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{name: 'HomeStack'}],
                }),
              );
            } catch (e) {
              alert(e);
            }
          }
        })
        .catch(error => {
          setLoading(false);
          switch (error.code) {
            case 'The password is invalid or the user does not have a password.':
              Toast.show({
                text: 'Wrong email or password!!',
                buttonText: '',
                type: 'danger',
                position: 'bottom',
              });
              break;
            default:
              alert(error);
          }
        });
    } catch (error) {
      alert(error);
    }
  };
  const handleSignUp = (name, email, password, repass) => {
    if (name == '') {
      Toast.show({
        text: 'Enter name',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    if (email == '') {
      Toast.show({
        text: 'Enter email',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    if (password == '') {
      Toast.show({
        text: 'Enter password',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    if (password != repass) {
      Toast.show({
        text: 'Mismatch password',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        text: 'Password must be 6 characters',
        buttonText: '',
        type: 'danger',
        position: 'bottom',
      });
      return;
    }
    setLoading(true);
    try {
      firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then(async user => {
          console.log(user);
          if (user.additionalUserInfo.isNewUser) {
            const newUser = {
              email: user.user.email,
              name: name,
              firebaseUid: user.user.uid,
            };
            try {
              firebase
                .database()
                .ref('/users/' + user.user.uid)
                .set(newUser);
            } catch (e) {
              alert(e);
            }
            try {
              await AsyncStorage.setItem('user', JSON.stringify(newUser));
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{name: 'HomeStack'}],
                }),
              );
            } catch (e) {
              alert(e);
            }
            setLoading(true);
          } else {
            handleLogin(email, password);
          }
        })
        .catch(error => {
          switch (error.code) {
            case 'auth/email-already-in-use':
              handleLogin(email, password);
              break;
          }
        });
    } catch (error) {
      alert(error);
    }
  };
  return (
    <Container>
      <Header
        style={{
          backgroundColor: 'white',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text style={{color: 'grey', fontSize: 24}}>Register</Text>
      </Header>
      <ScrollView>
        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            flexDirection: 'column',
            marginTop: 10,
          }}>
          <Text style={{fontSize: 18}}>Enter name</Text>
          <Input
            placeholder={'Enter name'}
            placeholderTextColor="grey"
            onChangeText={txt => {
              setName(txt);
            }}
            style={styles.inputField}
            underlineColor="grey"
            value={name}
          />
        </View>
        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            flexDirection: 'column',
            marginTop: 10,
          }}>
          <Text style={{fontSize: 18}}>Enter email</Text>
          <Input
            placeholder={'Enter email'}
            placeholderTextColor="grey"
            onChangeText={txt => {
              setEmail(txt);
            }}
            autoCapitalize="none"
            style={styles.inputField}
            underlineColor="grey"
            value={email}
            keyboardType="email-address"
          />
        </View>

        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            flexDirection: 'column',
            marginTop: 15,
          }}>
          <Text style={{fontSize: 18}}>Enter password</Text>
          <Input
            placeholder={'Enter password'}
            placeholderTextColor="grey"
            onChangeText={txt => {
              setPassword(txt);
            }}
            style={styles.inputField}
            underlineColor="grey"
            value={password}
            secureTextEntry={true}
          />
        </View>
        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            flexDirection: 'column',
            marginTop: 15,
          }}>
          <Text style={{fontSize: 18}}>Re-enter password</Text>
          <Input
            placeholder={'Re-Enter password'}
            placeholderTextColor="grey"
            onChangeText={txt => {
              setRepass(txt);
            }}
            style={styles.inputField}
            underlineColor="grey"
            value={repass}
            secureTextEntry={true}
          />
        </View>
      </ScrollView>
      <Button
        full
        disabled={loading}
        style={{
          backgroundColor: loading ? 'grey' : '#FC5372',
          marginTop: 20,
          width: '90%',
          borderRadius: 5,
          alignSelf: 'center',
          marginBottom: 20,
        }}
        onPress={() => {
          handleSignUp(name, email, password, repass);
        }}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{color: 'white', fontSize: 18}}>Register now</Text>
        )}
      </Button>
      <Button
        full
        transparent
        disabled={loading}
        style={{
          marginTop: 20,
          width: '90%',
          borderRadius: 5,
          alignSelf: 'center',
          marginBottom: 20,
          borderWidth: 2,
          borderColor: '#FC5372',
        }}
        onPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'LoginScreen'}],
            }),
          );
        }}>
        <Text style={{color: 'grey', fontSize: 18}}>Back to Login</Text>
      </Button>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
    </Container>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff'},
  head: {height: 40, backgroundColor: '#f1f8ff'},
  wrapper: {flexDirection: 'row'},
  title: {flex: 1, backgroundColor: '#f6f8fa'},
  row: {height: 28},
  text: {textAlign: 'center'},
  inputContainer: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 15,
  },
  inputField: {
    borderWidth: 1,
    width: '100%',
    borderColor: 'lightgrey',
    borderRadius: 5,
    height: 50,
    backgroundColor: '#F8F9FA',
  },
});
