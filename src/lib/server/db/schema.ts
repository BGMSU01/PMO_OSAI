import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// วันที่เก็บเป็น text รูปแบบ YYYY-MM-DD, เวลาบันทึกเป็น integer (epoch ms)
// ใช้ชนิดข้อมูลพื้นฐานของ SQLite ล้วน เพื่อย้ายไป Cloudflare D1 ได้โดยไม่ต้องแก้ schema

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	name: text('name').notNull(),
	email: text('email'),
	position: text('position'),
	duties: text('duties'),
	level: text('level'),
	startDate: text('start_date'),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
	passwordHash: text('password_hash').notNull(),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	// บังคับเปลี่ยนรหัสผ่านเมื่อเข้าระบบครั้งแรก / หลัง Admin ตั้งรหัสให้
	mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
	// กันเดารหัสผ่าน: นับครั้งที่ผิดติดกัน และล็อกชั่วคราว
	failedLogins: integer('failed_logins').notNull().default(0),
	lockedUntil: integer('locked_until'),
	createdAt: integer('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull()
});

export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description'),
	status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
	createdAt: integer('created_at').notNull()
});

export const tasks = sqliteTable(
	'tasks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		code: text('code').notNull().unique(),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' }),
		priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
		status: text('status', { enum: ['todo', 'doing', 'done'] }).notNull().default('todo'),
		startDate: text('start_date'),
		dueDate: text('due_date'),
		estimatedHours: real('estimated_hours').notNull().default(0),
		actualHours: real('actual_hours').notNull().default(0),
		progress: integer('progress').notNull().default(0),
		note: text('note'),
		// ใช้กันข้อมูลถูกเขียนทับ: แก้ได้เฉพาะเมื่อ version ตรงกับที่เปิดอ่านมา
		version: integer('version').notNull().default(1),
		// ลบแบบซ่อนไว้: มีค่า = ถูกลบ (กู้คืนได้)
		deletedAt: integer('deleted_at'),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(t) => [index('tasks_project_idx').on(t.projectId), index('tasks_assignee_idx').on(t.assigneeId)]
);

export const activityLogs = sqliteTable(
	'activity_logs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
		entityType: text('entity_type', { enum: ['task', 'project', 'user', 'system'] }).notNull(),
		entityId: integer('entity_id'),
		entityLabel: text('entity_label'),
		action: text('action', {
			enum: ['create', 'update', 'delete', 'restore', 'status', 'revert', 'import', 'login']
		}).notNull(),
		// JSON: { field: { from, to } }
		changes: text('changes'),
		createdAt: integer('created_at').notNull()
	},
	(t) => [index('activity_entity_idx').on(t.entityType, t.entityId), index('activity_created_idx').on(t.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
