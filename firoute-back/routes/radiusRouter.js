import { Router } from 'express';
import {
    getUsers,
    createUser,
    deleteUser,
} from '../controllers/radiusUserController.js';
import { getSessions } from '../controllers/radiusSessionController.js';
import {
    getNasList,
    createNas,
} from '../controllers/radiusNasController.js';
import {
    getAllProfiles,
    getProfileByGroupname,
    createProfile,
    updateProfile,
    deleteProfile
} from '../controllers/radiusProfileController.js';

const router = Router();

router.get('/users', getUsers);
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);

router.get('/sessions', getSessions);

router.get('/nas', getNasList);
router.post('/nas', createNas);

// Radius Profile routes
router.get('/profiles', getAllProfiles);
router.get('/profiles/:groupname', getProfileByGroupname);
router.post('/profiles', createProfile);
router.put('/profiles/:groupname', updateProfile);
router.delete('/profiles/:groupname', deleteProfile);

export default router;