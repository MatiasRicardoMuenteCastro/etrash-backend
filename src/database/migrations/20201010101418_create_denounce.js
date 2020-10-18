
exports.up = function(knex) {
    return knex.schema.createTable('denounces',function(table){
        table.increments('id');
        table.string('pointID_denounced').notNullable();
        table.specificType('userID_denouncer','text[]').defaultTo('{\'\'NULL\'\'}');
        table.specificType('companyID_denouncer','text[]').defaultTo('{\'\'NULL\'\'}');
        table.integer('denounces_counter')
        table.string('last_denounce_date').notNullable();

        table.foreign('pointID_denounced').references('id').inTable('discarts_points');

    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('denounces');
};
