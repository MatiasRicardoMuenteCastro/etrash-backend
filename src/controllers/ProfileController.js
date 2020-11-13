const connection = require('../database/connection');
const crypto = require('crypto');

module.exports = {

	userProfile: async (req, res) => {
		const userId = req.headers.authorization;		
		const matchIdUser = await connection('users').where('id', userId)
		.select('id').first();

		if(!matchIdUser){
			return res.status(400).json({error: 'Usuário não encontrado'});
		}
		
		const user = await connection('users').where('id', userId)
		.select('id', 
				'name', 
				'email', 
				'discarts', 
				'country', 
				'city', 
				'region', 
				'latitude', 
				'longitude').first();


		var userAvatarUrl = await connection('uploads').where('user_id', userId)
		.select('url').first();

		if (!userAvatarUrl) {
			userAvatarUrl = null;
			return res.json({user, userAvatarUrl});
		}

		const userAvatar = userAvatarUrl.url;
		
		return res.json({user, userAvatar});

	},

	updateUserAvatar: async (req, res) => {
		const userId = req.headers.authorization;
		const {url} = req.body;
		const userDB = await connection('users').where('id', userId)
		.select('id').first();

		if (!userDB) {
			return res.status(400).json({error: 'Usuário não encontrado'});
		}

		const userUrl = await connection('uploads').where('user_id',userDB.id).select('url')
		.first();

		if(!userUrl){
			const imageID = await crypto.randomBytes(5).toString("HEX");
			await connection('uploads').insert({
				id: imageID,
				url,
				user_id: userDB.id
			});
			return res.json({succes: 'Não foi encontrada uma imagem no banco de dados, então essa imagem foi inserida automaticamente'});
		}

	    await connection('uploads').where('user_id', userDB.id)
		.update({ url });

		return res.json({sucess: 'Avatar atualizado'}); 
	},

	companyProfile: async (req, res) => {
		const companyId = req.headers.authorization;	
		const matchIdCompany = await connection('companies').where('id', companyId)
		.select('id').first();

		if(!matchIdCompany){
			return res.status(400).json({error: 'Usuário não encontrado'});
		}
		
		const company = await connection('companies').where('id', companyId)
		.select('id', 
				'cnpj', 
				'name', 
				'email', 
				'discarts',
				'activity',
				'collector', 
				'country', 
				'city', 
				'region',
				'neightborhood',
				'phone', 
				'latitude', 
				'longitude').first();

		var companyAvatarUrl = await connection('uploads').where('company_id', companyId)
		.select('url').first();

		if (!companyAvatarUrl) {
			companyAvatarUrl = null;
			return res.json({company, companyAvatarUrl});
		}

		const companyAvatar = companyAvatarUrl.url;
		return res.json({company, companyAvatar});

	},

	updateCompanyAvatar: async (req, res) => {
		const companyId = req.headers.authorization;
		const {url} = req.body; 
		const companyDB = await connection('companies').where('id', companyId)
		.select('id').first();

		if (!companyDB) {
			return res.status(400).json({error: 'Empresa não encontrada'});
		}

		const companyUrl = await connection('uploads').where('company_id',companyDB.id).select('url')
		.first();

		if(!companyUrl){
			const companyImageID = await crypto.randomBytes(5).toString("HEX");

			await connection('uploads').insert({
				id: companyImageID,
				url,
				company_id: companyDB.id
			});

			return res.json({succes: 'Não foi encontrada uma imagem no banco de dados, então essa imagem foi inserida automaticamente'});
		}

		 await connection('uploads').where('company_id', companyDB.id)
		.update({ url });

		return res.json({sucess: 'Avatar atualizado'}); 
	},


	pointProfile: async (req, res) => {
		const pointId = req.headers.authorization;		
		const matchIdPoint = await connection('discarts_points').where('id', pointId)
		.select('id').first();

		if(!matchIdPoint){
			return res.status(400).json({error: 'Ponto de coleta não encontrado'});
		}

		const point = await connection('discarts_points').where('id', pointId)
		.select('id', 
				'name', 
				'rua',
				'numero', 
				'discarts', 
				'country', 
				'city', 
				'region', 
				'latitude', 
				'longitude').first();

		var pointAvatarUrl = await connection('uploads').where('point_id', pointId)
		.select('url').first();

		if (!pointAvatarUrl) {
			pointAvatarUrl = null;
			return res.json({point, pointAvatarUrl});
		}

		const pointAvatar = pointAvatarUrl.url;

		return res.json({point, pointAvatar});

	},

	updatePointAvatar: async (req, res) => {
		const pointId = req.headers.authorization; 
		const {url} = req.body;
		const pointDB = await connection('discarts_points').where('id', pointId)
		.select('id').first();

		if (!pointDB) {
			return res.status(400).json({error: 'Ponto de coleta não encontrado'});
		}

		const pointUrl = await connection('uploads').where('point_id',pointDB.id).select('url')
		.first();

		if(!pointUrl){
			const pointImageID = await crypto.randomBytes(5).toString("HEX");

			await connection('uploads').insert({
				id: pointImageID,
				url,
				point_id:pointDB.id
			});

			return res.json({succes: 'Não foi encontrada uma imagem no banco de dados, então essa imagem foi inserida automaticamente'});
		}

		await connection('uploads').where('point_id', pointDB.id)
		.update({ url });

		return res.json({sucess: 'Avatar atualizado'}); 
		
	}

};