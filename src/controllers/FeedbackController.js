const connection = require('../database/connection');
const crypto = require('crypto');

module.exports = {
    createUser: async(req,res) => {
        const {comment,
               veryGood,
               good,
               bad,
               tooBad,
               pointId} = req.body;
        
        const userId = req.headers.authorization;

        const userFind = await connection('users').where('id',userId).select('id').first();

        if(!userFind){
            return res.status(401).json({error:'Usuário não encontrado.'});
        }

        const pointFind = await connection('discarts_points').where('id',pointId).select('id').first();

        if(!pointFind){
            return res.status(401).json({error:'Ponto não encontrado.'});
        }

        const feedBackId = crypto.randomBytes(5).toString("HEX");

        await connection('feedback').where('point_id',pointFind.id).insert({
            id: feedBackId,
            comment: comment,
            very_good: veryGood,
            good: good,
            bad: bad,
            too_bad: tooBad,
            user_id: userFind.id,
            point_id: pointFind.id
        });

        return res.json({success: "Feedback enviado com sucesso."});
    },
    createCompany: async(req,res)=>{
        const {comment,
            veryGood,
            good,
            bad,
            tooBad,
            pointId} = req.body;
        
     const companyId = req.headers.authorization;

     const companyFind = await connection('companies').where('id',companyId).select('id').first();

     if(!companyFind){
         return res.status(401).json({error:'Companhia não encontrada.'});
     }

     const pointFind = await connection('discarts_points').where('id',pointId).select('id').first();

     if(!pointFind){
         return res.status(401).json({error:'Ponto não encontrado.'});
     }

     const feedBackId = crypto.randomBytes(5).toString("HEX");

     await connection('feedback').where('point_id',pointFind.id).insert({
         id: feedBackId,
         comment: comment,
         very_good: veryGood,
         good: good,
         bad: bad,
         too_bad: tooBad,
         company_id: companyFind.id,
         point_id: pointFind.id
     });

     return res.json({success: "Feedback enviado com sucesso."});
    },
    getPointFeedback: async(req,res)=>{
        const findFeedback = await connection('feedback').select('*');

        if(!findFeedback){
            return res.status(401).json({error:'Feedbacks não encontrados'});
        }

        return res.json(findFeedback);
    },
    deleteFeedbackUser: async(req,res)=>{
        const userId = req.headers.authorization;

        const {commentId} = req.body;

        const userFind = await connection('users').where('id',userId).select('id').first();

        if(!userFind){
            return res.status(401).json({error:'Usuário não encontrado'});
        }

        const commentFind = await connection('feedback').where('id',commentId).select('id').first();

        if(!commentFind){
            return res.status(401).json({error:'Comentario não encotrado'})
        }

        const commentRelationFind = await connection('feedback').where('id',commentId).select('user_id').first();

        if(commentRelationFind.user_id !== userFind.id){
            return res.status(401).json({error:'Você não tem permissão para excluir esse comentario.'});
        }

        await connection('feedback').where('id',commentFind.id).delete();

        return res.json({success:'Feedback excluido com sucesso.'});

    },
    deleteFeedbackCompany: async(req,res)=>{
        const companyId = req.headers.authorization;

        const {commentId} = req.body;

        const companyFind = await connection('companies').where('id',companyId).select('id').first();

        if(!companyFind){
            return res.status(401).json({error:'Companhia não encontrada'});
        }

        const commentFind = await connection('feedback').where('id',commentId).select('id').first();

        if(!commentFind){
            return res.status(401).json({error:'Comentario não encotrado'})
        }

        const commentRelationFind = await connection('feedback').where('id',commentId).select('company_id').first();

        if(commentRelationFind.company_id !== companyFind.id){
            return res.status(401).json({error:'Você não tem permissão para excluir esse comentario.'});
        }

        await connection('feedback').where('id',commentFind.id).delete();

        return res.json({success:'Feedback excluido com sucesso.'});

    }  
}