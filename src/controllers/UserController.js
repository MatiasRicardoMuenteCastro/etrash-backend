const connection = require('../database/connection');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const fs = require('fs');
const mailer = require('../modules/mailer');

function hash(password){
	const saltRounds = 12;
	const salt = bcrypt.genSaltSync(saltRounds);
	const hash = bcrypt.hashSync(password, salt);
	return hash;
}

function generateToken(params = {}){
	return jwt.sign(params, authConfig.secret,{
		expiresIn: 86400,
	});
}

module.exports = {
	index: async (req, res) => {
		const users = await connection('users').select('name', 'email', 'discarts');
		const [count] = await connection('users').count();
		res.header('X-Total-Count', count['count']);
		
		const usersAvatarsUrl = await connection('uploads').whereNotNull('user_id').select('url');

		const usersAvatars = usersAvatarsUrl.map(function(item){
			const url = item.url;
			const avatar = url;
			return avatar;
		}); 
		return res.json({users, avatar: usersAvatars});
	},

	create: async (req, res) => {
		const {name, 
			   email, 
			   passwordInput, 
			   country, 
			   city, 
			   region, 
			   latitude,
			   longitude } = req.body;

		const findEmail = await connection('users').where('email',email).select('email').first();

		const findUser = await connection('users').where('name',name).select('name').first();

		if(findEmail){
			return res.status(401).json({error:"Email de usuário já cadastrado."});
		}

		if(findUser){
			return res.status(401).json({error:"Nome de usuário já cadastrado."});
		}

		const id = crypto.randomBytes(5).toString('HEX');
		const password = hash(passwordInput);
		
		await connection('users').insert({
			id,
			name,
			email,
			password,
			country,
			city,
			region,
			latitude,
			longitude
		});
		
		return res.json({
			welcome: `Bem vindo(a) ${name}`, 
			id: id,  
			name: name,
			email: email,
			token: generateToken({id: id})
		});
	},

	delete: async (req, res) => {
		const userId = req.headers.authorization;
		const { passwordInput } = req.body;

		const userIDDB = await connection('users').where('id', userId)
		.select('id').first();

		if(!userIDDB){
			return res.status(401).json({error: 'Operação não permitida!'});
		}

		const userPasswordMatch = await connection('users').where('id', userIDDB.id)
		.select('password').first();

		const passwordMatch = await bcrypt.compareSync(passwordInput, userPasswordMatch.password);

		if (!passwordMatch) {
			return res.status(401).json({error: 'Senha incorreta'});
		}

		const oldAvatarUrl = await connection('uploads').where('user_id', userId).select('url')
		.first();
		
		if(oldAvatarUrl){
			await connection('uploads').where('user_id', userId).delete();
		}
		await connection('feedback').where('user_id',userId).delete();
		await connection('users').where('id', userId).delete();
		return res.send();
		
	},
	updateData: async(req,res)=>{
		const {
			name,
			email,
			country,
			city,
			region,
			latitude,
			longitude
			} = req.body;
			
			const userId = req.headers.authorization;
			const userIDDB = await connection('users').select('id').where('id',userId).first();

			if(!userIDDB){
				return res.status(401).json({error:"Usuario não encontrado"});
			}

			const userFields = [name,email,country,city,region,latitude,longitude];

		 	const items = userFields.map(function(item){
				 if(item !== ""){
					 return item;
				 }
			 });

			const [varName,varEmail,varCountry,varCity,varRegion,varLatitude,varLongitude] = items;
			
			await connection('users').where('id',userIDDB.id).update({
				name:varName,
				email:varEmail,
				country:varCountry,
				city:varCity,
				region:varRegion,
				latitude:varLatitude,
				longitude:varLongitude
			});
			
			return res.json({sucess: "Informações de usuário atualizadas com sucesso."});
	},
	
	upload: async (req, res) => {
		const userId = req.headers.authorization;
		const url = req.headers.url;
		const userIDDB = await connection('users').where('id', userId)
		.select('id').first();

		if (!userIDDB) {
			return res.status(400).json({error: 'Usuário não encontrado.'})
		}

		const userUrl = await connection('uploads').where('user_id',userIDDB.id).select('url').first();

		if(userUrl){
			return res.status(401).json({error: 'Imagem de usuário já existente.'});
		}
		
		const id = crypto.randomBytes(5).toString('HEX');
		const user_id = userIDDB.id;

		await connection('uploads').insert({
			id,
			url,
			user_id
		}); 
		return res.json({sucess:"Imagem carregada com sucesso!" });
	},
	recovery: async(req,res) =>{
		const {email} = req.body;
		try{
			const findEmail = await connection('users').where('email',email).select('name')
			.first();

			if(!findEmail)
				return res.status(400).json({error: "Usuário não encontrado."});

			const token = crypto.randomBytes(20).toString('HEX');

			const now = new Date();
			now.setHours(now.getHours()+1);

			await connection('users').where('email',email).update({
				password_reset_token: token,
				password_reset_expires: now
			});

			mailer.sendMail({
				to: email,
				from:'etrash@outlook.com.br',
				template:'auth/forgot_password',
				context: {token}
			},(err)=>{
				if(err){
					return res.status(400).json({error: "Erro ao enviar o email."})
				}
				return res.send();
			});

		}catch(err){
			res.status(400).json({error: "Erro ao recuperar a senha, tente de novo."});
		}
	},
	reset: async(req,res)=>{
		const {email,token,password} = req.body;
		try{
			
			const findEmail = await connection('users').where('email',email).select('email')
			.first();

			if(!findEmail){
				return res.status(400).json({error: "Email não encontrado"});
			}

			const findResetToken = await connection('users').where('email',email).select('password_reset_token')
			.first();

			if(token !== findResetToken.password_reset_token){
				return res.status(400).json({error:"Chave para resetar a senha é inválida."});
			}

			const findResetExpires = await connection('users').where('email',email).select('password_reset_expires')
			.first();

			const now = new Date();

			if(now > findResetExpires){
				return res.status(400).json({error:"Sua chave para resetar a senha expirou, pegue uma nova."});
			}

			const passwordCrypt = hash(password);

			await connection('users').where('email',email).update({
				password: passwordCrypt,
				password_reset_token: null,
				password_reset_expires: null
			});

			return res.send({sucess:"Senha resetada com sucesso."});

		}catch(err){
			return res.status(400).json({error:"Erro ao resetar a senha."});
		}
	}

};
