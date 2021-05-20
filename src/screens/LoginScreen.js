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
const LoginScreen = ({navigation}) => {
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
    setLoading(true);
    try {
      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(async user => {
          if (user) {
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
            default:
              Toast.show({
                text: error.code,
                buttonText: '',
                type: 'danger',
                position: 'bottom',
              });
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
        <Text style={{color: 'grey', fontSize: 24}}>Login</Text>
      </Header>
      <ScrollView>
        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            flexDirection: 'column',
            marginTop: '40%',
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
          handleLogin(email, password);
        }}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{color: 'white', fontSize: 18}}>Login</Text>
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
              routes: [{name: 'SignUp'}],
            }),
          );
        }}>
        <Text style={{color: 'grey', fontSize: 18}}>No account? Register</Text>
      </Button>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
    </Container>
  );
};

export default LoginScreen;

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
