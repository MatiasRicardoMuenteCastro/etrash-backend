
exports.up = function(knex) {
  return knex.schema.createTable('feedback',function(table){
    table.string("id").primary().notNullable();
    table.string("comment");
    table.integer("very_good");
    table.integer("good");
    table.integer("bad");
    table.integer("too_bad");
    table.string("user_id");
    table.string("company_id");
    table.string("point_id");

    table.foreign("user_id").references("id").inTable("users");
    table.foreign("company_id").references("id").inTable("companies");
    table.foreign("point_id").references("id").inTable("discarts_points")
  })

  
};

exports.down = function(knex) {
    return knex.schema.dropTable("feedback");
};
