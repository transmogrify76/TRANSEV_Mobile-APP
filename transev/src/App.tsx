import React from 'react';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import Menu from './components/Menu';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import VehicleCreation from './pages/VehicleCreation';
import UserProfile from './pages/UserProfile';
import FavoriteChargers from './pages/FavoriteChargers';
import MyBookings from './pages/MyBookings';
import HelpAndSupport from './pages/HelpAndSupport';
import UserMessages from './pages/UserMessages';
import DisputeForm from './pages/DisputeForm';
import ResetPassword from './pages/ResetPassword';
import TransactionHistory from './pages/TransactionHistory';
import MyBookingsList from './pages/MyBookingsList';
import BillList from './pages/BillList';
import BillDetail from './pages/BillDetail';
import ActiveSession from './pages/ActiveSession';


const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <Menu />
      <IonRouterOutlet>

        <Route path="" component={Login} exact={true} />
        <Route path="/signup" component={Signup} exact={true} />
        <Route path="/login" component={Login} exact={true} />
        <Route path="/dashboard" component={Dashboard} exact={true} />
        <Route path="/wallet" component={Wallet} exact={true} />
        <Route path="/add-vehicle" component={VehicleCreation} exact={true} />
        <Route path="/userprofile" component={UserProfile} exact={true} />
        <Route path="/favourites" component={FavoriteChargers} exact={true} />
        <Route path="/bookings" component={MyBookings} exact={true} />
        <Route path="/help" component={HelpAndSupport} exact={true} />
        <Route path="/viewhelp" component={UserMessages} exact={true} />
        <Route path="/dispute" component={DisputeForm} exact={true} />
        <Route path="/reset" component={ResetPassword} exact={true} />
        <Route path="/transaction" component={TransactionHistory} exact={true} />
        <Route path="/mybookings" component={MyBookingsList} exact={true} />
        <Route path="/bills" exact component={BillList} />
        <Route path="/bill-detail/:billid" component={BillDetail} />
        <Route path="/active-session" component={ActiveSession} />



      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
