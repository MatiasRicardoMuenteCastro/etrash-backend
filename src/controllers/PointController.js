const connection = require('../database/connection');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const fs = require('fs');
const path = require('path');
const mailer = require('../modules/mailer');

function hash(password){
	const saltRounds = 12;
	const salt = bcrypt.genSaltSync(saltRounds);
	const hash = bcrypt.hashSync(password, salt);
	return hash;
}

function generateToken(params = {}){
	return jwt.sign(params, authConfig.secret,{
		expiresIn:86400,
	});
}

module.exports = {
    index: async (request, response) => {
        const points = await connection('discarts_points').select('name','rua','numero','numero','discarts','country','city','region');
        const [count] = await connection('companies').count();
        response.header('Total-Companies-Count', count['count']);

        const pointsAvatarsUrl = await connection('uploads').whereNotNull('point_id').select('url');

        const pointsAvatars = pointsAvatarsUrl.map(function(item){
            const url = item.url;
            const avatar = url
            return avatar;
        }); 
        return response.json({points, avatar: pointsAvatars});
    },
   	
   	create: async (request, response) => {
        const {name,
              email, 
              passwordInput, 
              discarts, 
              rua, 
              numero,
              country,
              city,
              region,
              latitude,
              longitude } = request.body;
            
        const nameDB = await connection('discarts_points').where('name',name).select('name')
        .first();

        if(nameDB){
            return response.status(401).json({error:"Nome do ponto já está cadastrado"});
        }

        const emailDB = await connection('discarts_points').where('email',email).select('email')
        .first();

        if(emailDB){
            return response.status(401).json({error:"Email do ponto já cadastrado."});
        }

        const password = hash(passwordInput);
        const id = crypto.randomBytes(5).toString("HEX");

        await connection('discarts_points').insert({
            id,
            name,
            email,
            password,
            discarts,
            rua,
            numero,
            country,
            city,
            region,
            latitude,
            longitude
        });
        
        return response.json({
            welcome: `Bem-vindo(a) Ponto de Coleta ${name}`,
            id: id,
            name: name,
            discarts: discarts,
            token: generateToken({id: id})
        });

    },
    
    delete: async (request, response) => {
        const point_id = request.headers.authorization;
        const { passwordInput } = request.body;
        const idSearch = await connection('discarts_points').where('id', point_id).select('id')
        .first();
        
        if(!idSearch){
            return response.status(401).json({error: "Você não tem permissão para deletar este ponto!"});
        }

        const passwordDB = await connection('discarts_points').where('id', point_id)
        .select('password').first();
        const passwordMatch = await bcrypt.compareSync(passwordInput, passwordDB.password);

        if(!passwordMatch){
        	return response.status(400).json({error: 'Senha inválida'});
        }

        const oldPointUrl = await connection('uploads').where('point_id',  point_id).select('url')
        .first();
        
        if(oldPointUrl){            
            const imageID = await connection('uploads').select('id').where('point_id',point_id).first();

            await connection('uploads').where('id',imageID.id).delete();
        }
        
        await connection('feedback').where('point_id',idSearch.id).delete();
        await connection('denounces').where('pointID_denounced',idSearch.id).delete();
        await connection('discarts_points').where('id', point_id).delete();
        
        return response.send();
    },

    updateData: async(req,res)=>{
		const {
			name,
            email,
            street,
            number,
			country,
			city,
			region,
			latitude,
			longitude
			} = req.body;
			
			const pointId = req.headers.authorization;
			const pointIDDB = await connection('discarts_points').select('id').where('id',pointId).first();

			if(!pointIDDB){
				return res.status(401).json({error:"Usuario não encontrado"});
			}

			const pointFields = [name,email,street,number,country,city,region,latitude,longitude];

		 	const items = pointFields.map(function(item){
				 if(item !== ""){
					 return item;
				 }
			 });

			const [varName,varEmail,varStreet,varNumber,varCountry,varCity,varRegion,varLatitude,varLongitude] = items;
			
			await connection('discarts_points').where('id',pointIDDB.id).update({
				name:varName,
                email:varEmail,
                rua:varStreet,
                numero:varNumber,
				country:varCountry,
				city:varCity,
				region:varRegion,
				latitude:varLatitude,
				longitude:varLongitude
			});
			
			return res.json({sucess: "Informações do ponto de coleta atualizadas com sucesso."});
	},
    
    upload: async(request, response) => {
        const point_id = request.headers.authorization;
        const url = request.headers.url;
        const pointIDDB = await connection('discarts_points').where('id', point_id)
        .select('id').first();

        if (!pointIDDB) {
            return response.status(400).json({error: 'Ponto de coleta não encontrado.'})
        }

        const pointUrl = await connection('uploads').where('point_id',pointIDDB.id).select('url').first();

        if(pointUrl){
            return response.json({error: 'Imagem do ponto já existente.'});
        }
        
        const id = crypto.randomBytes(5).toString('HEX');
        const newPointId = pointIDDB.id;
        const imgName = request.file.originalname;
        const size = request.file.size;
        const key = request.file.filename;
        await connection('uploads').insert({
            id,
            imgName,
            size,
            key,
            url,
            point_id: newPointId
        }); 
        return response.json({sucess:"Imagem carregada com sucesso!" });
    
    },
    recovery: async(req,res) =>{
		const {email} = req.body;
		try{
			const findEmail = await connection('discarts_points').where('email',email).select('name')
			.first();

			if(!findEmail)
				return res.status(400).json({error: "Ponto de descarto não encontrado."});

			const token = crypto.randomBytes(20).toString('HEX');

			const now = new Date();
			now.setHours(now.getHours()+1);

			await connection('discarts_points').where('email',email).update({
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
			
			const findEmail = await connection('discarts_points').where('email',email).select('email')
			.first();

			if(!findEmail){
				return res.status(400).json({error: "Email não encontrado"});
			}

			const findResetToken = await connection('discarts_points').where('email',email).select('password_reset_token')
			.first();

			if(token !== findResetToken.password_reset_token){
				return res.status(400).json({error:"Chave para resetar a senha é inválida."});
			}

			const findResetExpires = await connection('discarts_points').where('email',email).select('password_reset_expires')
			.first();

			const now = new Date();

			if(now > findResetExpires){
				return res.status(400).json({error:"Sua chave para resetar a senha expirou, pegue uma nova."});
			}

			const passwordCrypt = hash(password);

			await connection('discarts_points').where('email',email).update({
				password: passwordCrypt,
				password_reset_token: null,
				password_reset_expires: null
			});

			return res.send({sucess:"Senha resetada com sucesso."});

		}catch(err){
			return res.status(400).json({error:"Erro ao resetar a senha."});
		}
	}

}    
