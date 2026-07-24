#!/usr/bin/env node

const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:111876354@localhost:5432/gestion_logements"
});

async function addDateColumns() {
  try {
    await client.connect();
    console.log('🚀 Migration: Adding date columns to logements table...');

    // Check if columns exist first
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'logements' AND column_name = 'date_debut_contrat'
      ) as col_exists
    `);
    
    if (checkResult.rows[0].col_exists) {
      console.log('✅ Column date_debut_contrat already exists');
    } else {
      console.log('Adding date_debut_contrat column...');
      await client.query(`
        ALTER TABLE logements ADD COLUMN date_debut_contrat DATE;
      `);
      console.log('✅ date_debut_contrat added');
    }

    const checkResult2 = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'logements' AND column_name = 'date_fin_contrat'
      ) as col_exists
    `);
    
    if (checkResult2.rows[0].col_exists) {
      console.log('✅ Column date_fin_contrat already exists');
    } else {
      console.log('Adding date_fin_contrat column...');
      await client.query(`
        ALTER TABLE logements ADD COLUMN date_fin_contrat DATE;
      `);
      console.log('✅ date_fin_contrat added');
    }

    // Add other missing columns
    const checkAssurancePdf = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'logements' AND column_name = 'assurance_pdf'
      ) as col_exists
    `);
    
    if (!checkAssurancePdf.rows[0].col_exists) {
      console.log('Adding missing document columns...');
      await client.query(`
        ALTER TABLE logements ADD COLUMN assurance_pdf TEXT;
        ALTER TABLE logements ADD COLUMN assurance_nom VARCHAR(255);
        ALTER TABLE logements ADD COLUMN bail_pdf TEXT;
        ALTER TABLE logements ADD COLUMN bail_nom VARCHAR(255);
        ALTER TABLE logements ADD COLUMN etat_lieux_pdf TEXT;
        ALTER TABLE logements ADD COLUMN etat_lieux_nom VARCHAR(255);
        ALTER TABLE logements ADD COLUMN etat_lieux_photos TEXT;
        ALTER TABLE logements ADD COLUMN fournisseur_gaz VARCHAR(255);
      `);
      console.log('✅ Document columns added');
    }

    // Check if type_lit column exists in lits table
    const checkTypeLit = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'lits' AND column_name = 'type_lit'
      ) as col_exists
    `);
    
    if (!checkTypeLit.rows[0].col_exists) {
      console.log('Adding type_lit column to lits table...');
      await client.query(`
        ALTER TABLE lits ADD COLUMN type_lit VARCHAR(50);
      `);
      console.log('✅ type_lit column added to lits');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addDateColumns();
