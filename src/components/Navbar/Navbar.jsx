import { Flex, Text, Button, Avatar, DropdownMenu } from '@radix-ui/themes';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import APIKeyModal from './APIKeyModal';
import ContextModal from './ContextModal';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="border-b border-gray-200 px-4 py-3 bg-white">
      <Flex justify="between" align="center">
        <Text size="5" weight="bold" className="text-indigo-600">
          Pyramid Solver
        </Text>

        <Flex gap="3" align="center">
          <APIKeyModal />
          
          <ContextModal />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button className="outline-none">
                <Avatar 
                  src={user?.photoURL} 
                  fallback={user?.displayName?.[0] || 'U'} 
                  radius="full"
                  size="2"
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>
                <Text size="2">{user?.displayName}</Text>
                <br />
                <Text size="1" color="gray">{user?.email}</Text>
              </DropdownMenu.Label>
              <DropdownMenu.Separator />
              <DropdownMenu.Item color="red" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Flex>
    </div>
  );
};

export default Navbar;
