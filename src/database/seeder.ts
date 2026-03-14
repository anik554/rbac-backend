import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { RoleType } from '../common/enums/role.enum';
import { PermissionAtom } from '../common/enums/permission.enum';

export async function seedDatabase(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const userRepo = dataSource.getRepository(User);

  console.log('🌱 Seeding permissions...');

  // 1. Seed all permission atoms
  const allAtoms = Object.values(PermissionAtom);
  for (const atom of allAtoms) {
    const exists = await permRepo.findOne({ where: { atom } });
    if (!exists) {
      const [resource, action] = atom.split('.');
      await permRepo.save(permRepo.create({ atom, resource, action }));
    }
  }

  console.log('🌱 Seeding roles...');

  // 2. Seed roles
  const roleNames = Object.values(RoleType);
  for (const name of roleNames) {
    const exists = await roleRepo.findOne({ where: { name } });
    if (!exists) {
      await roleRepo.save(roleRepo.create({ name }));
    }
  }

  console.log('🌱 Seeding admin user...');

  // 3. Create default admin
  const adminEmail = 'admin@rbac.com';
  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const adminRole = await roleRepo.findOne({
      where: { name: RoleType.ADMIN },
    });
    if (!adminRole) throw new Error('Admin role not found');
    const allPerms = await permRepo.find();

    const admin = userRepo.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      password: await bcrypt.hash('Admin@123456', 12),
    });
    admin.role = adminRole;
    admin.extraPermissions = allPerms;

    await userRepo.save(admin);
    console.log('✅ Admin user created: admin@rbac.com / Admin@123456');
  }

  console.log('✅ Seeding complete!');
}
