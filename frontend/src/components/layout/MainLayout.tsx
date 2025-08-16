import React from 'react'
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  FileTextOutlined,
  TrophyOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { logout } from '@/store/authSlice'

const { Header, Content, Footer } = Layout

const MainLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/exams', icon: <FileTextOutlined />, label: '考试中心' },
    { key: '/results', icon: <TrophyOutlined />, label: '成绩查询' },
  ]

  if (user?.role === 'admin' || user?.role === 'teacher') {
    menuItems.push({ key: '/admin', icon: <DashboardOutlined />, label: '管理后台' })
  }

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      dispatch(logout())
      navigate('/login')
    } else if (key === 'profile') {
      navigate('/profile')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#1677ff' }}>
        <div style={{ color: 'white', fontSize: '20px', marginRight: '40px' }}>
          贵阳市小学生测评平台
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, background: 'transparent' }}
        />
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
        >
          <Space style={{ color: 'white', cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.realName || user?.username || '用户'}</span>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', minHeight: '100%' }}>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        贵阳市教育局 ©2024 小学生测评服务平台
      </Footer>
    </Layout>
  )
}

export default MainLayout