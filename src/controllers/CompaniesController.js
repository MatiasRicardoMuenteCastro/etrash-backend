const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mailer = require('../modules/mailer')

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
   async index(request, response){
        const companies = await connection('companies')
        .select('id', 
                'name', 
                'email',
                'activity',
                'collector', 
                'country', 
                'city', 
                'region', 
                'neightborhood',
                'phone',
                'latitude', 
                'longitude');

        const [count] = await connection('companies').count();
        response.header('Total-Companies-Count', count['count']);

        const companiesAvatarsUrl = await connection('uploads').whereNotNull('company_id').select('url');
        
        const companiesAvatars = companiesAvatarsUrl.map(function(item){
            const url = item.url;
            const avatar = url;
            return avatar;
        }); 
        return response.json({companies, avatar: companiesAvatars});
    },

    async create(request, response){
        const { 
              cnpj, 
              passwordInput, 
              collector,
              country,
              city,
              region,
              latitude,
              longitude } = request.body;
        
        const findCNPJ = await connection('companies').where('cnpj',cnpj).select('cnpj').first();

        if(findCNPJ){
            return response.status(401).json({error:"CNPJ de companhia já existente."});
        }

        const id = crypto.randomBytes(5).toString("HEX");
        const password = hash(passwordInput);
        const dataCNPJ = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
        
        if (dataCNPJ.data.status == "ERROR") {
            return response.status(400).json({error: dataCNPJ.data.message});
        }

        const name = dataCNPJ.data.nome;

        const nameDB = await connection('companies').where('name',name).select('name')
        .first();

        if(nameDB){
            return response.status(401).json({error:"Companhia já registrada no banco de dados."});
        }

        const email = dataCNPJ.data.email;
        const activity = dataCNPJ.data.atividade_principal[0].text;
        const phone = dataCNPJ.data.telefone;
        const neightborhood = dataCNPJ.data.bairro;
        
        await connection('companies').insert({
            id,
            cnpj,
            name,
            email,
            password,
            activity,
            collector,
            country,
            city,
            region,
            neightborhood,
            phone,
            latitude, 
            longitude
        });

        return response.json({
            welcome: `Bem vindo: ${name}`,
            id: id,
            email: email,
            name: name,
            phone: phone,
            activity: activity,
            token: generateToken({id: id})
        });
    
    },
    
    async delete(request, response){
        const companyId = request.headers.authorization;
        const { passwordInput } = request.body;

        const companyIdBD = await connection('companies').where('id', companyId)
        .select('id').first();

        if(!companyIdBD){
            return response.status(401).json({error: 'Operação não permitida'});
        }

        const passwordDB = await connection('companies').where('id', companyIdBD.id)
        .select('password').first();

        const companyMatch = bcrypt.compareSync(passwordInput, passwordDB.password);
        
        if (!companyMatch) {
            return response.status(401).json({error: 'Senha Inválida'});
        }

        const oldCompanyUrl = await connection('uploads').where('company_id', companyId)
        .select('key').first();

        if(oldCompanyUrl){
            await connection('uploads').where('company_id',companyIdBD.id).delete();
        }   
        
        const companyCollector = await connection('companies').where('collector', true)
        .select('collector').first();
        
        if (companyCollector) {
            await connection('schedule').where('company_collector_id', companyIdBD.id).delete();
        }
        await connection('feedback').where('company_id',companyIdBD.id).delete();
        await connection('uploads').where('company_id', companyIdBD.id).delete();
        await connection('schedule').where('company_id', companyIdBD.id).delete();
        await connection('companies').where('id', companyIdBD.id).delete();
        return response.send();
    },
    
    updateData: async(req,res)=>{
		const {
			name,
			email,
			country,
			city,
            region,
            neightborhood,
            phone,
			latitude,
			longitude
			} = req.body;
			
			const companyId = req.headers.authorization;
            const companyIDDB = await connection('companies').select('id').where('id',companyId).first();

			if(!companyIDDB){
				return res.status(401).json({error:"Usuario não encontrado"});
			}

			const companyFields = [name,email,country,city,region,neightborhood,phone,latitude,longitude];

		 	const items = companyFields.map(function(item){
				 if(item !== ""){
					 return item;
				 }
			 });

			const [varName,varEmail,varCountry,varCity,varRegion,varNeightborhood,varPhone,varLatitude,varLongitude] = items;
			
			await connection('companies').where('id',companyIDDB.id).update({
				name:varName,
				email:varEmail,
				country:varCountry,
				city:varCity,
                region:varRegion,
                neightborhood:varNeightborhood,
                phone:varPhone,
				latitude:varLatitude,
				longitude:varLongitude
			});
			
			return res.json({sucess: "Informações da companhia atualizadas com sucesso."});
	},
    
    async upload(request, response){
        const companyId = request.headers.authorization;
        const {url} = request.body;
        const companyIDDB = await connection('companies').where('id', companyId)
        .select('id').first();

        if (!companyIDDB) {
            return response.status(400).json({error: 'Empresa não encontrado.'})
        }

        const companyUrl = await connection('uploads').where('company_id',companyIDDB.id).select('url').first();

        if(companyUrl){
            return response.json({error: 'Imagem de empresa já existente.'});
        }

        const id = crypto.randomBytes(5).toString('HEX');
        const company_id = companyIDDB.id;

        await connection('uploads').insert({
            id,
            url,
            company_id
        }); 
        return response.json({sucess:"Imagem carregada com sucesso!" });
    
    },

    async scheduling(request, response){
        const company_id = request.headers.authorization;
        const { nameCollector, date } = request.body;
        const companyDB = await connection('companies').where('id', company_id)
        .select('id').first();

        const idCollector = await connection('companies').where('name', nameCollector)
        .select('id').first();

        if (!companyDB) {
            return response.status(400).json({error: 'Empresa não encontrada'});
        }

        if (!idCollector) {
            return response.status(400).json({error: 'Empresa não encontrada'});
        }

        const company_collector_id = idCollector.id;
        const dateNow = Date();
        const date_scheduling = dateNow.toString();
        const date_collect = date;
        await connection('schedule').insert({
            company_id,
            company_collector_id,
            date_scheduling,
            date_collect
        });

        return response.json({sucess: 'Coleta Solicitada'});
    },

    async schedule(request, response){
        const company_id = request.headers.authorization;
        const idCompanyDB = await connection('companies').where('id', company_id)
        .select('id').first();

        if (!idCompanyDB) {
            return response.status(400).json({error: 'Empresa não encontrada'});
        }

        const collector = await connection('companies').where('id', idCompanyDB.id)
        .select('collector').first();

        if (collector.collector != true) {
            return response.status(400).json({error: 'Sua empresa não faz coleta de descartes eletrônicos'});
        }

        const solicitations = await connection('schedule').where('company_collector_id', idCompanyDB.id)
        .select('*');

        if (solicitations[0] == null) {
            return response.json({message: 'Nenhuma solicitação de descarte encontrada'});
        }

        const companySolicitation = await connection('companies')
        .join('schedule', 'schedule.company_id', '=', 'companies.id')
        .select('cnpj','name', 'email', 'discarts', 'activity', 'country', 'city', 'region', 'neightborhood', 'phone', 'latitude', 'longitude');

        return response.json({solicitations, companySolicitation});
    },
    async scheduleDelete(request, response){
        const id = request.headers.authorization;

        const idDB = await connection('companies').select('id').where('id',id).first();
        
        if(!idDB){
            return response.status(401).send('Erro ao deletar ponto');
        }

        await connection('schedule').where('company_id',idDB.id).delete();

        return response.status(200).json({sucess:'Agendamento deletado com sucesso!'});
        
    },
    recovery: async(req,res) =>{
		const {email} = req.body;
		try{
			const findEmail = await connection('companies').where('email',email).select('name')
			.first();

			if(!findEmail)
				return res.status(400).json({error: "Companhia não encontrada."});

			const token = crypto.randomBytes(20).toString('HEX');

			const now = new Date();
			now.setHours(now.getHours()+1);

			await connection('companies').where('email',email).update({
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
			
			const findEmail = await connection('companies').where('email',email).select('email')
			.first();

			if(!findEmail){
				return res.status(400).json({error: "Email não encontrado"});
			}

			const findResetToken = await connection('companies').where('email',email).select('password_reset_token')
			.first();

			if(token !== findResetToken.password_reset_token){
				return res.status(400).json({error:"Chave para resetar a senha é inválida."});
			}

			const findResetExpires = await connection('companies').where('email',email).select('password_reset_expires')
			.first();

			const now = new Date();

			if(now > findResetExpires){
				return res.status(400).json({error:"Sua chave para resetar a senha expirou, pegue uma nova."});
			}

			const passwordCrypt = hash(password);

			await connection('companies').where('email',email).update({
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
    
