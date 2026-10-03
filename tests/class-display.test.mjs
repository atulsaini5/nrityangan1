import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile('lib/classDisplay.ts','utf8');
const {ALL_FILTERS,displayAge,displayClassTitle,displayLevel,filterClasses,formatClassTime,groupClasses}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const session=(id,changes={})=>({id,title:'Beginner Kids',ageGroup:'5-12',level:'Beginner',dayOfWeek:'Friday',startTime:'16:30',durationMinutes:45,locationId:'studio-a',instructor:'Teacher',...changes});
test('age, level, weekday and location filters intersect without altering schedules',()=>{
 const data=[session('one'),session('two',{dayOfWeek:'Monday'}),session('three',{ageGroup:'Teen/Adult'}),session('four',{locationId:'studio-b'}),session('five',{level:'Intermediate'})];const before=JSON.stringify(data);
 assert.deepEqual(filterClasses(data,{age:'Kids',level:'Beginner',day:'Friday',location:'studio-a'}).map(c=>c.id),['one']);
 assert.equal(filterClasses(data,ALL_FILTERS).length,5);assert.equal(JSON.stringify(data),before);
 assert.equal(filterClasses(data,{...ALL_FILTERS,day:'Sunday'}).length,0);
});
test('combined levels, spelling variation, age ranges and all ages filter consistently',()=>{
 const data=[session('mixed',{ageGroup:'Teen/Adult',level:'Intermediate-Advanced'}),session('typo',{level:'Begineer'}),session('range',{ageGroup:'12–18'}),session('family',{ageGroup:'All Ages',level:'Mixed'})];
 assert.deepEqual(filterClasses(data,{...ALL_FILTERS,age:'Adults',level:'Advanced'}).map(c=>c.id),['mixed']);
 assert.deepEqual(filterClasses(data,{...ALL_FILTERS,age:'Teens',level:'Intermediate'}).map(c=>c.id),['mixed']);
 assert(filterClasses(data,{...ALL_FILTERS,level:'Beginner'}).some(c=>c.id==='typo'));
 for(const age of ['Kids','Teens','Adults'])assert(filterClasses(data,{...ALL_FILTERS,age}).some(c=>c.id==='family'));
 assert(filterClasses(data,{...ALL_FILTERS,age:'Adults'}).some(c=>c.id==='range'));
});
test('display formatting standardizes known labels without rewriting distinctive class names',()=>{
 assert.equal(displayClassTitle('Kathak Beginner Kids'),'Beginner Kathak');
 assert.equal(displayClassTitle('Beginner/Intermediate Adult'),'Beginner / Intermediate Kathak');
 assert.equal(displayClassTitle('Begineer Teen/Adult'),'Beginner Kathak');
 assert.equal(displayClassTitle('Mom & Me'),'Mom & Me');
 assert.equal(displayAge('5-12'),'Ages 5–12');assert.equal(displayAge('KIDS/TEEN'),'Kids + Teens');assert.equal(displayAge('TEEN/ADULT'),'Teens + Adults');assert.equal(displayAge('ADULT'),'Adults');
 assert.equal(displayLevel('Intermediate-Advanced'),'Intermediate / Advanced');assert.equal(formatClassTime('23:00'),'11:00 PM');
});
test('grouping preserves all IDs and distinct ages, levels and descriptions; sessions sort chronologically',()=>{
 const data=[session('friday'),session('monday',{dayOfWeek:'Monday'}),session('adult',{ageGroup:'Adult'}),session('different-level',{level:'Intermediate'}),session('different-description',{curriculum:'A different curriculum'})];
 const groups=groupClasses(data);assert.equal(groups.length,4);assert.deepEqual(groups[0].sessions.map(s=>s.id),['monday','friday']);
 assert.deepEqual(groups.flatMap(g=>g.sessions.map(s=>s.id)).sort(),data.map(s=>s.id).sort());
});
test('stored level remains authoritative when a class title disagrees with it',()=>{
 const data=[session('conflict',{title:'Intermediate Teen/Adult',ageGroup:'Teen/Adult',level:'Beginner'})];
 assert.equal(filterClasses(data,{...ALL_FILTERS,level:'Intermediate'}).length,0);
 assert.equal(filterClasses(data,{...ALL_FILTERS,level:'Beginner'}).length,1);
});
