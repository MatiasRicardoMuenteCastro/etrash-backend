const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const routesAuth = express.Router();

const CompaniesController = require('./controllers/CompaniesController');
const UserController = require('./controllers/UserController');
const PointController = require('./controllers/PointController');
const DiscartController = require('./controllers/DiscartController');
const ProfileController = require('./controllers/ProfileController');
const botController = require('./controllers/botController');
const newsController = require('./controllers/NewsController');
const DenouncesController = require('./controllers/DenouncesController');
const FeedBackController = require('./controllers/FeedbackController');

const authMiddleware = require('./middlewares/auth');
const MulterUsers = require('./config/MulterUsers');
const MulterCompanies = require('./config/MulterCompanies');
const MulterPoints = require('./config/MulterPoints');

routesAuth.use(authMiddleware);
routesAuth.use(express.urlencoded({extended: true }));
routesAuth.use(morgan('dev'));

routesAuth.use('/files-users',express.static(path.resolve(__dirname,'.','temp','uploads','users')));
routesAuth.post('/users/upload', multer(MulterUsers).single('file'), UserController.upload);
routesAuth.get('/users', UserController.index);
routesAuth.delete('/users/delete', UserController.delete);
routesAuth.put('/users/update',UserController.updateData);
routesAuth.post('/users/denounces/point',DenouncesController.userDenounce);
routesAuth.post('/users/feedback',FeedBackController.createUser);
routesAuth.delete('/users/feedback/delete',FeedBackController.deleteFeedbackUser);

routesAuth.use('/files-companies',express.static(path.resolve(__dirname,'.','temp','uploads','companies')));
routesAuth.post('/companies/upload', multer(MulterCompanies).single('file'), CompaniesController.upload);
routesAuth.get('/companies', CompaniesController.index);
routesAuth.delete('/companies/delete', CompaniesController.delete);
routesAuth.post('/companies/scheduling', CompaniesController.scheduling);
routesAuth.get('/companies/schedule', CompaniesController.schedule);
routesAuth.delete('/companies/schedule/delete',CompaniesController.scheduleDelete);
routesAuth.put('/companies/update',CompaniesController.updateData);
routesAuth.post('/companies/denounces/point',DenouncesController.companyDenounce);
routesAuth.post('/companies/feedback',FeedBackController.createCompany);
routesAuth.delete('/companies/feedback/delete',FeedBackController.deleteFeedbackCompany);

routesAuth.use('/files-points',express.static(path.resolve(__dirname,'.','temp','uploads','points')));
console.log(path.resolve(__dirname,'.','temp','uploads','points'));
routesAuth.post('/point/upload', multer(MulterPoints).single('file'), PointController.upload);
routesAuth.get('/point', PointController.index);
routesAuth.delete('/point/delete', PointController.delete);
routesAuth.put('/point/update',PointController.updateData);
routesAuth.get('/point/feedbacks',FeedBackController.getPointFeedback);

routesAuth.put('/discarts/user/update', DiscartController.userUpdate);
routesAuth.put('/discarts/company/update', DiscartController.companyUpdate);
routesAuth.put('/discarts/point/update', DiscartController.pointUpdate);
routesAuth.get('/discarts/user', DiscartController.userGet);
routesAuth.get('/discarts/company', DiscartController.companyGet);
routesAuth.get('/discarts/points', DiscartController.pointGet);
routesAuth.get('/discarts/points/search', DiscartController.searchPointForUser);

routesAuth.get('/profile/user', ProfileController.userProfile);
routesAuth.post('/profile/user/avatar', multer(MulterUsers).single('file'), ProfileController.updateUserAvatar);
routesAuth.get('/profile/company', ProfileController.companyProfile);
routesAuth.post('/profile/company/avatar', multer(MulterCompanies).single('file'), ProfileController.updateCompanyAvatar);
routesAuth.get('/profile/point', ProfileController.pointProfile);
routesAuth.post('/profile/point/avatar', multer(MulterPoints).single('file'), ProfileController.updatePointAvatar);

routesAuth.post('/watson/send',botController.sendChat);
routesAuth.get('/news/get',newsController.get);

module.exports = routesAuth;