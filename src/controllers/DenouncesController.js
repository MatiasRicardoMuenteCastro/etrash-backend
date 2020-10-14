const connection = require('../database/connection');
const mailer = require('../modules/mailer');


module.exports={
    async userDenounce(request,response){
        const userID = request.headers.authorization;

        const {pointID} = request.body;

        const userFind = await connection('users').select('id').where('id',userID)
        .first();

        if(!userFind){
            return response.status(401).json({error:'Usuário não encontrado'});
        }

        const pointFind = await connection('discarts_points').select('id').where('id',pointID)
        .first();

        if(!pointFind){
            return response.status(401).json({error:'Ponto de coleta não encontrado.'});
        }

        const findDenounce = await connection('denounces').select('id').where('pointID_denounced',pointFind.id).first();


        if(!findDenounce){

            await connection('denounces').insert({
                pointID_denounced: pointFind.id,
                denounces_counter: 1,
                last_denounce_date: Date()
            });
            
            const userName = await connection('users').select('name').where('id',userFind.id).first();
            const pointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
            const denounceDate = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
            .first();

            const [user, point, date] = [userName.name,pointName.name,denounceDate.last_denounce_date];
        
            return response.json({
                message: 'Ponto denunciado com sucesso, informações da denuncia: ',
                Denounciator: user,
                Denounced: point,
                Denounce_date: date
            });
        }

        const denouncesNumber = await connection('denounces').where('pointID_denounced',pointFind.id).select('denounces_counter')
        .first();

        const counter = denouncesNumber.denounces_counter+1;

        await connection('denounces').where('pointID_denounced',pointFind.id).update({
            denounces_counter:counter,
            last_denounce_date: Date()
        });


        const refreshCounter = await connection('denounces').where('pointID_denounced',pointFind.id).select('denounces_counter')
        .first();

        if(refreshCounter.denounces_counter >= 2 && refreshCounter.denounces_counter <= 3){
            const email = await connection('discarts_points').select('email').where('id',pointFind.id)
            .first();

            let findUserName = await connection('users').where('id',userFind.id).select('name').first();
            let findPointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
            let findDateEmail = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
            .first();

            let denounces = refreshCounter.denounces_counter;

            let [denouncerEmail,pointEmail,dateEmail] = [findUserName.name,findPointName.name,findDateEmail.last_denounce_date];

            mailer.sendMail({
				to: email.email,
				from:'etrash@outlook.com.br',
                template:'auth/denounce',
                context:{denouncerEmail,pointEmail,dateEmail,denounces}
			},(err)=>{
				if(err){
					console.log(err);
				}
			});

        }

        if(refreshCounter.denounces_counter >= 4){
            const email = await connection('discarts_points').select('email').where('id',pointFind.id)
            .first();

            let findPointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();

            let pointEmail = findPointName.name;
            let deleteDate = new Date().toString();

            mailer.sendMail({
				to: email.email,
				from:'etrash@outlook.com.br',
				template:'auth/point_deleted',
				context: {pointEmail,deleteDate}
			},(err)=>{
				if(err){
					console.log(err);
                }
            });

            await connection('denounces').where('pointID_denounced',pointFind.id).delete();
            await connection('discarts_points').where('id',pointFind.id).delete();
            
            return response.json({deleted: 'Esse ponto de coleta foi deletado por excesso de denuncias, obrigado pela colaboração.'});
        }

        const userName = await connection('users').select('name').where('id',userFind.id).first();
        const pointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
        const denounceDate = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
        .first();

        const [user, point, date] = [userName.name,pointName.name,denounceDate.last_denounce_date];

        return response.json({
            message: 'Ponto denunciado com sucesso, informações da denuncia: ',
            Denounciator: user,
            Denounced: point,
            Denounce_date: date
        });
        
    },
    async companyDenounce(request,response){
        const companyID = request.headers.authorization;

        const {pointID} = request.body;

        const companyFind = await connection('companies').select('id').where('id',companyID)
        .first();

        if(!companyFind){
            return response.status(401).json({error:'Companhia não encontrada'});
        }

        const pointFind = await connection('discarts_points').select('id').where('id',pointID)
        .first();

        if(!pointFind){
            return response.status(401).json({error:'Ponto de coleta não encontrado.'});
        }

        const findDenounce = await connection('denounces').select('id').where('pointID_denounced',pointFind.id).first();

        if(!findDenounce){
            await connection('denounces').insert({
                pointID_denounced: pointFind.id,
                denounces_counter: 1,
                last_denounce_date: Date()
            });
            
            const companyName = await connection('companies').select('name').where('id',companyFind.id).first();
            const pointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
            const denounceDate = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
            .first();

            const [company, point, date] = [companyName.name,pointName.name,denounceDate.last_denounce_date];
        
            return response.json({
                message: 'Ponto denunciado com sucesso, informações da denuncia: ',
                Denounciator: company,
                Denounced: point,
                Denounce_date: date
            });
        }

        const denouncesNumber = await connection('denounces').where('pointID_denounced',pointFind.id).select('denounces_counter')
        .first();

        const counter = denouncesNumber.denounces_counter+1;

        await connection('denounces').where('pointID_denounced',pointFind.id).update({
            denounces_counter:counter,
            last_denounce_date: Date()
        });


        const refreshCounter = await connection('denounces').where('pointID_denounced',pointFind.id).select('denounces_counter')
        .first();

        if(refreshCounter.denounces_counter >= 2 && refreshCounter.denounces_counter <= 3){
            const email = await connection('discarts_points').select('email').where('id',pointFind.id)
            .first();

            
            let findCompanyName = await connection('companies').where('id',companyFind.id).select('name').first();
            let findPointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
            let findDateEmail = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
            .first();

            let denounces = refreshCounter.denounces_counter;

            let [denouncerEmail,pointEmail,dateEmail] = [findCompanyName.name,findPointName.name,findDateEmail.last_denounce_date];
        
            mailer.sendMail({
				to: email.email,
				from:'etrash@outlook.com.br',
				template:'auth/denounce',
				context: {denouncerEmail,pointEmail,dateEmail,denounces}
			},(err)=>{
				if(err){
					console.log(err);
				}
			});

        }

        if(refreshCounter.denounces_counter >= 4){
            const email = await connection('discarts_points').select('email').where('id',pointFind.id)
            .first();

            let findPointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();

            let pointEmail = findPointName.name;
            let deleteDate = new Date().toString();

            mailer.sendMail({
				to: email.email,
				from:'etrash@outlook.com.br',
				template:'auth/point_deleted',
				context: {pointEmail,deleteDate}
			},(err)=>{
				if(err){
					console.log(err);
                }
            });
            
            await connection('denounces').where('pointID_denounced',pointFind.id).delete();
            await connection('discarts_points').where('id',pointFind.id).delete();
            
            return response.json({deleted: 'Esse ponto de coleta foi deletado por excesso de denuncias, obrigado pela colaboração.'});
        }

        const companyName = await connection('companies').select('name').where('id',companyFind.id).first();
        const pointName = await connection('discarts_points').select('name').where('id',pointFind.id).first();
        const denounceDate = await connection('denounces').select('last_denounce_date').where('pointID_denounced',pointFind.id)
        .first();

        const [company, point, date] = [companyName.name,pointName.name,denounceDate.last_denounce_date];
        
        return response.json({
            message: 'Ponto denunciado com sucesso, informações da denuncia: ',
            Denounciator: company,
            Denounced: point,
            Denounce_date: date
        });
        
    }

}